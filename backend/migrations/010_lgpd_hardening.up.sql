-- Widen phone column to accommodate AES-256-GCM ciphertext (base64-encoded)
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(100);

-- Replace the non-unique CPF index with a unique partial index.
-- Soft-deleted rows are excluded so a CPF can be reused only after account deletion.
DROP INDEX IF EXISTS idx_users_cpf_hash;
CREATE UNIQUE INDEX idx_users_cpf_hash ON users(cpf_hash) WHERE deleted_at IS NULL;
