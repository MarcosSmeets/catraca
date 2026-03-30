-- name: CreateSeat :one
INSERT INTO seats (id, event_id, section, row, number, price_cents, status, col, row_index)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetSeatByID :one
SELECT * FROM seats WHERE id = $1;

-- name: ListSeatsByEventID :many
SELECT * FROM seats WHERE event_id = $1 ORDER BY section, row_index, col;

-- name: UpdateSeatStatus :exec
UPDATE seats SET status = $2 WHERE id = $1;
