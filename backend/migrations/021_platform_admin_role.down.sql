-- Revert to roles without platform_admin; fails if any user still has platform_admin
UPDATE users SET role = 'admin' WHERE role = 'platform_admin';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'organizer', 'staff'));
