ALTER TABLE attempts ADD COLUMN IF NOT EXISTS public_name text;
CREATE TABLE IF NOT EXISTS revoked_records (
  code_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
ALTER TABLE revoked_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS revoked_records_expiry ON revoked_records(expires_at);
