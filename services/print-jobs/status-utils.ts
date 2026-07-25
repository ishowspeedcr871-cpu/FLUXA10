import type { PrintJobStatus } from "@prisma/client";

export const RECENTLY_COMPLETED_QUEUE_WINDOW_MS = 60 * 60 * 1000;

export const ACTIVE_PRINT_JOB_STATUSES = [
  "DRAFT",
  "UPLOADED",
  "VALIDATING",
  "QUEUED",
  "ASSIGNED",
  "OTP_GENERATED",
  "OTP_VERIFIED",
  "WAITING_FOR_PRINTER",
  "PRINTING",
  "READY",
] as const satisfies readonly PrintJobStatus[];

export const FINAL_PRINT_JOB_STATUSES = [
  "PRINT_COMPLETED",
  "RELEASED",
  "COLLECTED",
  "COMPLETED",
] as const satisfies readonly PrintJobStatus[];

export function isFinalPrintJobStatus(status: PrintJobStatus | string): status is PrintJobStatus {
  return (FINAL_PRINT_JOB_STATUSES as readonly string[]).includes(status);
}

export function getActiveQueueCompletedCutoff(now = new Date()) {
  return new Date(now.getTime() - RECENTLY_COMPLETED_QUEUE_WINDOW_MS);
}

export function getActiveQueueVisibilityWhere(now = new Date()) {
  return {
    OR: [
      { status: { in: [...ACTIVE_PRINT_JOB_STATUSES] } },
      {
        status: { in: [...FINAL_PRINT_JOB_STATUSES] },
        completedAt: { gte: getActiveQueueCompletedCutoff(now) },
      },
    ],
  };
}

export function completedAtForStatus(
  toStatus: PrintJobStatus | string,
  existingCompletedAt?: Date | null,
  now = new Date(),
) {
  return isFinalPrintJobStatus(toStatus) ? (existingCompletedAt ?? now) : existingCompletedAt;
}
