-- Keep employee dashboard OTP visibility and verification fast at one-hour expiry scale.
CREATE INDEX IF NOT EXISTS "PrintJob_org_status_updated_idx"
  ON "PrintJob" ("organizationId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "PrintJobOtp_status_expires_printJob_idx"
  ON "PrintJobOtp" ("status", "expiresAt", "printJobId");
