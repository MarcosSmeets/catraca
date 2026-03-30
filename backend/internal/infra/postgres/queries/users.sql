-- name: CreateUser :one
INSERT INTO users (id, name, email, password_hash, cpf_hash, phone, role)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL;

-- name: ExistsByCPFHash :one
SELECT EXISTS(SELECT 1 FROM users WHERE cpf_hash = $1 AND deleted_at IS NULL);

-- name: UpdateUser :exec
UPDATE users
SET name = $2, email = $3, phone = $4
WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $2
WHERE id = $1 AND deleted_at IS NULL;
