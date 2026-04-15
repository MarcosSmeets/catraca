-- name: InsertStripeWebhookInbox :one
INSERT INTO stripe_webhook_inbox (raw_body, stripe_signature, status)
VALUES ($1, $2, 'pending')
RETURNING id, created_at;

-- name: UpdateStripeWebhookInboxInvalid :exec
UPDATE stripe_webhook_inbox
SET status = 'invalid_signature',
    error_message = $2,
    processed_at = now()
WHERE id = $1;

-- name: UpdateStripeWebhookInboxDuplicate :exec
UPDATE stripe_webhook_inbox
SET status = 'duplicate_event',
    stripe_event_id = $2,
    event_type = $3,
    processed_at = now()
WHERE id = $1;

-- name: UpdateStripeWebhookInboxProcessed :exec
UPDATE stripe_webhook_inbox
SET status = 'processed',
    stripe_event_id = $2,
    event_type = $3,
    processed_at = now()
WHERE id = $1;

-- name: UpdateStripeWebhookInboxFailed :exec
UPDATE stripe_webhook_inbox
SET status = 'failed',
    stripe_event_id = COALESCE($2, stripe_event_id),
    event_type = COALESCE($3, event_type),
    error_message = $4,
    processed_at = now()
WHERE id = $1;

-- name: InsertStripeProcessedWebhookEvent :exec
INSERT INTO stripe_processed_webhook_events (stripe_event_id, inbox_id)
VALUES ($1, $2);
