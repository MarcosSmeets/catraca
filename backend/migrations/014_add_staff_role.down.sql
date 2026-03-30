ALTER TABLE tickets DROP COLUMN IF EXISTS used_at;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'organizer'));
