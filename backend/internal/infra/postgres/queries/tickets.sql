-- name: CreateTicket :one
INSERT INTO tickets (id, order_id, event_id, seat_id, qr_code, status, purchased_at, holder_user_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetTicketByID :one
SELECT * FROM tickets WHERE id = $1;

-- name: ListTicketsByUserID :many
SELECT t.* FROM tickets t
WHERE t.holder_user_id = $1
ORDER BY t.purchased_at DESC;

-- name: ListTicketsByOrderID :many
SELECT * FROM tickets WHERE order_id = $1 ORDER BY created_at;

-- name: UpdateTicketHolderUserID :exec
UPDATE tickets SET holder_user_id = $2, updated_at = NOW() WHERE id = $1;
