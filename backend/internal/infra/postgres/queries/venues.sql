-- name: CreateVenue :one
INSERT INTO venues (id, name, city, state, capacity)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetVenueByID :one
SELECT * FROM venues WHERE id = $1 AND deleted_at IS NULL;

-- name: ListVenues :many
SELECT * FROM venues WHERE deleted_at IS NULL ORDER BY name;
