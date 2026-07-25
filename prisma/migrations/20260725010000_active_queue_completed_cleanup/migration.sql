-- Keep active employee queue cleanup efficient without deleting historical print jobs.
UPDATE "PrintJob"
SET "completedAt" = COALESCE("completedAt", "updatedAt", NOW())
WHERE "status" IN ('PRINT_COMPLETED', 'RELEASED', 'COLLECTED', 'COMPLETED')
  AND "completedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "PrintJob_organizationId_status_completedAt_idx"
  ON "PrintJob" ("organizationId", "status", "completedAt");
