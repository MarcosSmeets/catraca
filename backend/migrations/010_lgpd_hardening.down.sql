-- Revert phone column width
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(20);

-- Revert to the original non-unique index
DROP INDEX IF EXISTS idx_users_cpf_hash;
CREATE INDEX idx_users_cpf_hash ON users(cpf_hash);
