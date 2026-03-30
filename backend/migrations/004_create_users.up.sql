CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    cpf_hash      VARCHAR(64) NOT NULL,
    phone         VARCHAR(20) NOT NULL DEFAULT '',
    role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_cpf_hash ON users(cpf_hash);
