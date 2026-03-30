-- name: CreateReservation :one
INSERT INTO reservations (id, seat_id, user_id, expires_at, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetReservationByID :one
SELECT * FROM reservations WHERE id = $1;

-- name: GetActiveReservationBySeatID :one
SELECT * FROM reservations
WHERE seat_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()
LIMIT 1;

-- name: UpdateReservationStatus :exec
UPDATE reservations SET status = $2 WHERE id = $1;

-- name: ListReservationsByUserID :many
SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC;
