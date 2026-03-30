ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'organizer', 'staff'));

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
