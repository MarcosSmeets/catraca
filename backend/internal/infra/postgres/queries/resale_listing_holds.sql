-- name: InsertResaleListingHold :one
INSERT INTO resale_listing_holds (id, resale_listing_id, user_id, expires_at, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetResaleListingHoldByID :one
SELECT * FROM resale_listing_holds WHERE id = $1;

-- name: GetActiveResaleListingHoldByListingID :one
SELECT * FROM resale_listing_holds
WHERE resale_listing_id = $1 AND status = 'ACTIVE' AND expires_at > NOW();

-- name: MarkResaleListingHoldConverted :one
UPDATE resale_listing_holds
SET status = 'CONVERTED', updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE' AND expires_at > NOW()
RETURNING *;

-- name: MarkResaleListingHoldExpiredByUser :exec
UPDATE resale_listing_holds
SET status = 'EXPIRED', updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE';

-- name: RevertResaleListingHoldToActive :exec
UPDATE resale_listing_holds
SET status = 'ACTIVE', updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'CONVERTED';

-- name: ExpireStaleResaleListingHolds :exec
UPDATE resale_listing_holds
SET status = 'EXPIRED', updated_at = NOW()
WHERE status = 'ACTIVE' AND expires_at <= NOW();
