CREATE TABLE IF NOT EXISTS instructors (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  instructor_id uuid NOT NULL REFERENCES instructors ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '8 hours'
);
CREATE TABLE IF NOT EXISTS cohorts (
  id uuid PRIMARY KEY,
  instructor_id uuid NOT NULL REFERENCES instructors ON DELETE CASCADE,
  name text NOT NULL,
  problem text NOT NULL,
  join_code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY,
  token_hash text UNIQUE NOT NULL,
  cohort_id uuid REFERENCES cohorts ON DELETE CASCADE,
  problem text NOT NULL,
  code_hash text NOT NULL,
  display_name text NOT NULL,
  probes jsonb NOT NULL CHECK (jsonb_typeof(probes)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  issued_at timestamptz,
  certificate text UNIQUE
);
CREATE INDEX IF NOT EXISTS attempts_by_cohort ON attempts(cohort_id,created_at DESC);
CREATE INDEX IF NOT EXISTS attempts_by_age ON attempts(created_at);
CREATE TABLE IF NOT EXISTS answers (
  attempt_id uuid NOT NULL REFERENCES attempts ON DELETE CASCADE,
  position smallint NOT NULL,
  answer_hash text NOT NULL,
  correct boolean NOT NULL,
  elapsed_ms integer NOT NULL CHECK (elapsed_ms BETWEEN 0 AND 86400000),
  PRIMARY KEY(attempt_id,position)
);
CREATE TABLE IF NOT EXISTS rate_windows (
  scope_hash text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL
);
CREATE TABLE IF NOT EXISTS app_key (
  singleton boolean PRIMARY KEY CHECK (singleton),
  value text NOT NULL
);
INSERT INTO app_key VALUES (true,gen_random_uuid()::text || gen_random_uuid()::text) ON CONFLICT DO NOTHING;
