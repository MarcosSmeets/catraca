-- name: CreateOrganization :one
INSERT INTO organizations (id, name, slug, subscription_status)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetOrganizationBySlug :one
SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL;

-- name: GetOrganizationByID :one
SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL;

-- name: ListOrganizations :many
SELECT * FROM organizations
WHERE deleted_at IS NULL
ORDER BY name ASC
LIMIT $1 OFFSET $2;

-- name: CountOrganizations :one
SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL;

-- name: UpdateOrganization :exec
UPDATE organizations
SET name = $2, slug = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateOrganizationSubscription :exec
UPDATE organizations
SET
    stripe_customer_id     = $2,
    stripe_subscription_id = $3,
    subscription_status    = $4,
    current_period_end     = $5,
    updated_at             = NOW()
WHERE id = $1 AND deleted_at IS NULL;
