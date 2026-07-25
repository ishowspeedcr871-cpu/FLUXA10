import { prisma } from "@/database/client";
import { completedAtForStatus } from "@/services/print-jobs/status-utils";
import { z } from "zod";
import {
  upsertPrinterFromDiscovery,
  updatePrinterTelemetry,
} from "@/services/printers/printer-service";
import { randomBytes } from "node:crypto";

export async function verifyOrganizationApiKey(key: string) {
  const apiKey = await prisma.organizationApiKey.findUnique({
    where: { key },
    include: { organization: true },
  });

  if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
    return null;
  }

  // Do not block high-frequency connector polling on telemetry writes.
  void prisma.organizationApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => console.warn("[CONNECTOR_API_KEY_TOUCH_FAILED]", error));

  return apiKey.organization;
}

export async function createOrganizationApiKey(organizationId: string, name: string) {
  const key = `fluxa_${randomBytes(32).toString("hex")}`;

  return prisma.organizationApiKey.create({
    data: {
      organizationId,
      name,
      key,
    },
  });
}

const registerPrinterSchema = z.object({
  name: z.string(),
  macAddress: z.string(),
  ipAddress: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
});

export async function registerPrinter(organizationId: string, data: any) {
  const validated = registerPrinterSchema.parse(data);
  return upsertPrinterFromDiscovery(organizationId, validated);
}

const heartbeatSchema = z.object({
  macAddress: z.string(),
  status: z.enum(["ONLINE", "OFFLINE", "BUSY", "ERROR", "MAINTENANCE"]),
  health: z.enum(["GOOD", "WARNING", "CRITICAL", "UNKNOWN"]).optional(),
  inkLevel: z.any().optional(),
});

export async function printerHeartbeat(organizationId: string, data: any) {
  const validated = heartbeatSchema.parse(data);

  const printer = await prisma.printer.findUnique({
    where: {
      organizationId_macAddress: {
        organizationId,
        macAddress: validated.macAddress,
      },
    },
  });

  if (!printer) throw new Error("Printer not registered");

  return updatePrinterTelemetry(printer.id, validated);
}

export async function getPendingJobsForPrinter(organizationId: string, macAddress: string) {
  const printer = await prisma.printer.findUnique({
    where: {
      organizationId_macAddress: {
        organizationId,
        macAddress,
      },
    },
  });

  if (!printer) return [];

  return prisma.printJob.findMany({
    where: {
      printerId: printer.id,
      status: "PRINTING",
    },
    include: { files: true },
  });
}

export async function getPendingJobsForOrganization(organizationId: string) {
  return prisma.printJob.findMany({
    where: {
      organizationId,
      status: { in: ["PRINTING", "OTP_VERIFIED", "WAITING_FOR_PRINTER"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      copies: true,
      color: true,
      duplex: true,
      pageCount: true,
      estimatedCost: true,
      printerId: true,
      files: {
        select: { id: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
      },
      printer: { select: { id: true, name: true, status: true, macAddress: true } },
    },
  });
}

export async function updatePrintJobStatusFromConnector(
  organizationId: string,
  jobId: string,
  status: "COMPLETED" | "FAILED",
  notes?: string,
) {
  const job = await prisma.printJob.findFirst({
    where: { id: jobId, organizationId },
    include: { printer: true },
  });

  if (!job) throw new Error("Job not found");

  const updatedJob = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status,
      completedAt: completedAtForStatus(status),
      events: {
        create: {
          toStatus: status,
          note: notes || `Print job reported ${status.toLowerCase()} by Desktop Print Agent.`,
        },
      },
    },
  });

  // If printer was associated, free it back to ONLINE if no other printing jobs
  if (job.printerId) {
    const activeJobsOnPrinter = await prisma.printJob.count({
      where: { printerId: job.printerId, status: "PRINTING" },
    });
    if (activeJobsOnPrinter === 0) {
      await prisma.printer.update({
        where: { id: job.printerId },
        data: { status: "ONLINE" },
      });
    }
  }

  return updatedJob;
}
