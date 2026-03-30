-- name: CreateTicket :one
INSERT INTO tickets (id, order_id, event_id, seat_id, qr_code, status, purchased_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetTicketByID :one
SELECT * FROM tickets WHERE id = $1;

-- name: ListTicketsByUserID :many
SELECT t.* FROM tickets t
JOIN orders o ON o.id = t.order_id
WHERE o.user_id = $1
ORDER BY t.purchased_at DESC;

-- name: ListTicketsByOrderID :many
SELECT * FROM tickets WHERE order_id = $1 ORDER BY created_at;
