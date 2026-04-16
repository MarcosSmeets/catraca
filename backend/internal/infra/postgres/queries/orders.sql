-- name: CreateOrder :one
INSERT INTO orders (id, user_id, total_cents, stripe_payment_id, status,
  buyer_name, buyer_email, buyer_cpf, buyer_phone,
  buyer_cep, buyer_street, buyer_neighborhood, buyer_city, buyer_state,
  kind, resale_listing_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM orders WHERE id = $1;

-- name: ListOrdersByUserID :many
SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateOrderStatus :exec
UPDATE orders SET status = $2 WHERE id = $1;

-- name: UpdateOrderStripePaymentID :exec
UPDATE orders SET stripe_payment_id = $2 WHERE id = $1;

-- name: CreateOrderReservation :exec
INSERT INTO order_reservations (order_id, reservation_id)
VALUES ($1, $2);

-- name: ListOrderReservationIDs :many
SELECT reservation_id FROM order_reservations WHERE order_id = $1;

-- name: HasPendingOrderForReservation :one
SELECT EXISTS (
  SELECT 1 FROM order_reservations orr
  INNER JOIN orders o ON o.id = orr.order_id
  WHERE orr.reservation_id = $1 AND o.status = 'PENDING'
) AS has_pending;
