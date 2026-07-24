"use server";

import { unstable_rethrow } from "next/navigation";
import { listPrintQueue, releasePrintJobByOtp } from "@/services/print-queue/queue-service";
import { serializeData } from "@/lib/serialization";
import { prisma } from "@/database/client";
import { getEmployeeProfile, requireEmployeeContext } from "@/services/employee/employee-service";
import { hashOtp, normalizeOtp, OTP_DIGITS } from "@/services/print-jobs/otp-utils";

export async function fetchLiveQueue(filters?: { status?: string; priority?: string; q?: string }) {
  const result = await listPrintQueue({
    page: 1,
    pageSize: 50,
    status: (filters?.status as any) || "all",
    priority: (filters?.priority as any) || "all",
    assigned: "all",
    q: filters?.q || "",
    sort: "createdAt",
    direction: "desc",
  });
  return serializeData(result.jobs);
}

export async function verifyOtpForReviewAction(otp: string) {
  try {
    const { session, organization } = await requireEmployeeContext();
    const cleanOtp = normalizeOtp(otp);
    if (cleanOtp.length !== OTP_DIGITS) {
      return { success: false, error: `Please enter a valid ${OTP_DIGITS}-digit OTP code.` };
    }

    let targetJobId: string | null = null;

    // 1. Try finding in PrintJobOtp table by codeHash
    const foundOtp = await prisma.printJobOtp.findFirst({
      where: {
        codeHash: hashOtp(cleanOtp),
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
        printJob: { organizationId: organization.id },
      },
      include: { printJob: true },
    });

    if (foundOtp) {
      targetJobId = foundOtp.printJobId;
    } else {
      // 2. Fallback for legacy jobs with OTP columns on PrintJob, using indexed lookup.
      const matchingJob = await prisma.printJob.findFirst({
        where: {
          organizationId: organization.id,
          status: { notIn: ["COMPLETED", "CANCELLED", "FAILED"] },
          OR: [{ otpCodeHash: hashOtp(cleanOtp) }, { otpCode: cleanOtp }],
        },
        select: { id: true },
      });

      if (matchingJob) {
        targetJobId = matchingJob.id;
      }
    }

    if (!targetJobId) {
      return { success: false, error: "Invalid or expired collection OTP." };
    }

    // Load the print job with dependencies
    const job = await prisma.printJob.findFirst({
      where: { id: targetJobId, organizationId: organization.id },
      include: {
        customerUser: true,
        files: true,
        printer: true,
      },
    });

    if (!job) {
      return { success: false, error: "Print job not found." };
    }

    // Mark the OTP as verified if it was from foundOtp
    if (foundOtp) {
      await prisma.printJobOtp.update({
        where: { id: foundOtp.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByUserId: session.userId,
        },
      });
    }

    // Update status to OTP_VERIFIED if not already printing or completed
    if (["DRAFT", "QUEUED", "OTP_GENERATED", "READY"].includes(job.status)) {
      await prisma.printJob.update({
        where: { id: job.id },
        data: {
          status: "OTP_VERIFIED",
          events: {
            create: {
              fromStatus: job.status,
              toStatus: "OTP_VERIFIED",
              actorUserId: session.userId,
              note: "OTP successfully verified by employee. Job is now ready for review.",
            },
          },
        },
      });
      job.status = "OTP_VERIFIED";
    }

    return {
      success: true,
      job: serializeData(job),
    };
  } catch (err: any) {
    unstable_rethrow(err);
    return { success: false, error: err.message || "Failed to verify OTP." };
  }
}

export async function releaseJobWithUpdatedSettingsAction(
  jobId: string,
  updatedSettings: {
    color?: boolean;
    copies?: number;
    duplex?: boolean;
    paperSize?: string;
    orientation?: string;
    pageRange?: string;
    printerId?: string;
    printQuality?: string;
    scaling?: string;
    fitToPage?: boolean;
  },
  newEstimatedCost: number,
  reasonForModification?: string,
) {
  try {
    const { session, organization } = await requireEmployeeContext();

    // Fetch the current job
    const job = await prisma.printJob.findUnique({
      where: { id: jobId, organizationId: organization.id },
      include: { printer: true },
    });

    if (!job) {
      return { success: false, error: "Print job not found." };
    }

    const currentMeta = (job.metadata as any) || {};

    // Save original settings if they aren't already saved
    if (!currentMeta.originalCustomerSettings) {
      currentMeta.originalCustomerSettings = {
        color: job.color,
        copies: job.copies,
        duplex: job.duplex,
        estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : 0,
        paperSize: currentMeta.uploadConfiguration?.paperSize || "A4",
        orientation: currentMeta.uploadConfiguration?.orientation || "portrait",
        pageRange: currentMeta.uploadConfiguration?.pageRange || null,
        paperQuality: currentMeta.uploadConfiguration?.paperQuality || "standard",
        scaling: currentMeta.uploadConfiguration?.scaling || "fit",
        fitToPage: currentMeta.uploadConfiguration?.fitToPage ?? true,
      };
    }

    // Merge updatedSettings into metadata
    const uploadConfig = currentMeta.uploadConfiguration || {};
    if (updatedSettings.paperSize !== undefined) uploadConfig.paperSize = updatedSettings.paperSize;
    if (updatedSettings.orientation !== undefined)
      uploadConfig.orientation = updatedSettings.orientation;
    if (updatedSettings.pageRange !== undefined) uploadConfig.pageRange = updatedSettings.pageRange;
    if (updatedSettings.printQuality !== undefined)
      uploadConfig.paperQuality = updatedSettings.printQuality;
    if (updatedSettings.scaling !== undefined) uploadConfig.scaling = updatedSettings.scaling;
    if (updatedSettings.fitToPage !== undefined) uploadConfig.fitToPage = updatedSettings.fitToPage;

    currentMeta.uploadConfiguration = uploadConfig;
    if (reasonForModification) {
      currentMeta.modificationReason = reasonForModification;
      currentMeta.modifiedByUserId = session.userId;
      currentMeta.modifiedAt = new Date().toISOString();
    }

    // Determine printer to send to
    let finalPrinterId = updatedSettings.printerId || job.printerId;

    if (!finalPrinterId) {
      // Find an online printer in the organization
      const onlinePrinter = await prisma.printer.findFirst({
        where: {
          organizationId: organization.id,
          status: "ONLINE",
          deletedAt: null,
        },
      });
      if (onlinePrinter) {
        finalPrinterId = onlinePrinter.id;
      }
    }

    // If we have a final printer, set state to PRINTING and printer status to BUSY
    let targetStatus: "PRINTING" | "WAITING_FOR_PRINTER" = "WAITING_FOR_PRINTER";
    if (finalPrinterId) {
      targetStatus = "PRINTING";
      await prisma.printer.update({
        where: { id: finalPrinterId },
        data: { status: "BUSY" },
      });
    }

    // Update job
    const updatedJob = await prisma.printJob.update({
      where: { id: jobId },
      data: {
        color: updatedSettings.color !== undefined ? updatedSettings.color : job.color,
        copies: updatedSettings.copies !== undefined ? updatedSettings.copies : job.copies,
        duplex: updatedSettings.duplex !== undefined ? updatedSettings.duplex : job.duplex,
        estimatedCost: newEstimatedCost,
        printerId: finalPrinterId || null,
        status: targetStatus,
        processingStartedAt: targetStatus === "PRINTING" ? new Date() : null,
        metadata: currentMeta,
        events: {
          create: {
            fromStatus: job.status,
            toStatus: targetStatus,
            actorUserId: session.userId,
            note: `Job released after review. Changes made: Color=${updatedSettings.color}, Copies=${updatedSettings.copies}, Duplex=${updatedSettings.duplex}, Printer=${finalPrinterId}. Reason: ${reasonForModification || "None"}`,
          },
        },
      },
    });

    return {
      success: true,
      message:
        targetStatus === "PRINTING"
          ? "Job successfully sent to printer."
          : "Job verified and placed in queue.",
      job: serializeData(updatedJob),
    };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed to release print job" };
  }
}

export async function submitOtpAction(otp: string) {
  try {
    const result = await releasePrintJobByOtp(otp);
    return {
      success: true,
      message: result.message,
      jobId: result.jobId,
    };
  } catch (err: any) {
    unstable_rethrow(err);
    return { success: false, error: err.message || "Failed to verify OTP" };
  }
}

export async function updateJobStatusAction(jobId: string, status: string) {
  try {
    const { organization, session } = await requireEmployeeContext();
    const job = await prisma.printJob.update({
      where: { id: jobId, organizationId: organization.id },
      data: {
        status: status as any,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        events: {
          create: {
            actorUserId: session.userId,
            toStatus: status as any,
            note: `Status updated manually to ${status} by employee.`,
          },
        },
      },
    });
    return { success: true, job: serializeData(job) };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed to update job status" };
  }
}

export async function updateJobPriorityAction(jobId: string, priority: string) {
  try {
    const { organization } = await requireEmployeeContext();
    const job = await prisma.printJob.update({
      where: { id: jobId, organizationId: organization.id },
      data: { priority: priority as any },
    });
    return { success: true, job: serializeData(job) };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed to update priority" };
  }
}

export async function reassignJobPrinterAction(jobId: string, printerId: string | null) {
  try {
    const { organization } = await requireEmployeeContext();
    const job = await prisma.printJob.update({
      where: { id: jobId, organizationId: organization.id },
      data: { printerId },
    });
    return { success: true, job: serializeData(job) };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed to reassign printer" };
  }
}

export async function cancelJobAction(jobId: string) {
  try {
    const { organization, session } = await requireEmployeeContext();
    const job = await prisma.printJob.update({
      where: { id: jobId, organizationId: organization.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        events: {
          create: {
            actorUserId: session.userId,
            toStatus: "CANCELLED",
            note: "Job cancelled by employee.",
          },
        },
      },
    });
    return { success: true, job: serializeData(job) };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed to cancel job" };
  }
}

export async function bulkReleaseAction(jobIds: string[]) {
  try {
    const { organization, session } = await requireEmployeeContext();
    await prisma.printJob.updateMany({
      where: { id: { in: jobIds }, organizationId: organization.id },
      data: { status: "PRINTING", processingStartedAt: new Date() },
    });
    return { success: true, message: `Successfully released ${jobIds.length} print jobs.` };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed bulk release" };
  }
}

export async function bulkCancelAction(jobIds: string[]) {
  try {
    const { organization } = await requireEmployeeContext();
    await prisma.printJob.updateMany({
      where: { id: { in: jobIds }, organizationId: organization.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return { success: true, message: `Cancelled ${jobIds.length} jobs.` };
  } catch (error: any) {
    unstable_rethrow(error);
    return { success: false, error: error.message || "Failed bulk cancel" };
  }
}

export async function fetchLiveSettingsData() {
  try {
    const { organization, user, membership } = await getEmployeeProfile();

    const printers = await prisma.printer.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: 10,
    });

    const awaitingJobs = await prisma.printJob.findMany({
      where: {
        organizationId: organization.id,
        status: { in: ["READY", "PRINTING", "QUEUED", "ASSIGNED"] },
      },
      include: {
        customerUser: true,
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return {
      success: true,
      user: serializeData(user),
      membership: serializeData(membership),
      organization: serializeData(organization),
      printers: serializeData(printers),
      jobs: serializeData(awaitingJobs),
    };
  } catch (error: any) {
    unstable_rethrow(error);
    console.error("Error fetching live settings data:", error);
    return { success: false, error: error.message || "Failed to fetch live settings data" };
  }
}
