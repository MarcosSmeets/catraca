-- name: InsertTicketResaleListing :one
INSERT INTO ticket_resale_listings (id, ticket_id, seller_user_id, price_cents, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetTicketResaleListingByID :one
SELECT * FROM ticket_resale_listings WHERE id = $1;

-- name: GetActiveTicketResaleListingByTicketID :one
SELECT * FROM ticket_resale_listings
WHERE ticket_id = $1 AND status = 'active';

-- name: ListActiveResaleListingsByEventID :many
SELECT
    l.id,
    l.ticket_id,
    l.seller_user_id,
    l.price_cents,
    l.status,
    l.created_at,
    l.updated_at,
    t.event_id,
    s.section AS seat_section,
    s.row AS seat_row,
    s.number AS seat_number
FROM ticket_resale_listings l
JOIN tickets t ON t.id = l.ticket_id
JOIN seats s ON s.id = t.seat_id
WHERE t.event_id = $1 AND l.status = 'active'
ORDER BY l.price_cents ASC, l.created_at ASC;

-- name: ListTicketResaleListingsBySellerUserID :many
SELECT * FROM ticket_resale_listings
WHERE seller_user_id = $1
ORDER BY created_at DESC;

-- name: CancelTicketResaleListing :exec
UPDATE ticket_resale_listings
SET status = 'cancelled', updated_at = NOW()
WHERE id = $1 AND seller_user_id = $2 AND status = 'active';

-- name: MarkTicketResaleListingSold :exec
UPDATE ticket_resale_listings
SET status = 'sold', updated_at = NOW()
WHERE id = $1 AND status = 'active';

-- name: HasPendingResaleOrderForListing :one
SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.resale_listing_id = $1 AND o.status = 'PENDING' AND o.kind = 'resale'
) AS has_pending;
