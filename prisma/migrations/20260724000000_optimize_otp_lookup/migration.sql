-- Speed up active OTP verification by hash while preserving tenant isolation via the joined print job.
CREATE INDEX IF NOT EXISTS "PrintJobOtp_codeHash_status_expiresAt_idx"
  ON "PrintJobOtp" ("codeHash", "status", "expiresAt");

-- Speed up legacy/fallback OTP hash lookups during OTP format transitions.
CREATE INDEX IF NOT EXISTS "PrintJob_otpCodeHash_status_idx"
  ON "PrintJob" ("otpCodeHash", "status");
