-- name: CreateOrder :one
INSERT INTO orders (id, user_id, total_cents, stripe_payment_id, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM orders WHERE id = $1;

-- name: ListOrdersByUserID :many
SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateOrderStatus :exec
UPDATE orders SET status = $2 WHERE id = $1;

-- name: CreateOrderReservation :exec
INSERT INTO order_reservations (order_id, reservation_id)
VALUES ($1, $2);

-- name: ListOrderReservationIDs :many
SELECT reservation_id FROM order_reservations WHERE order_id = $1;
