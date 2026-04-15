-- Raw Stripe webhook payloads (ingest returns 200 immediately; worker validates & processes).
CREATE TABLE stripe_webhook_inbox (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_body           BYTEA NOT NULL,
    stripe_signature   TEXT NOT NULL,
    status             TEXT NOT NULL CHECK (status IN (
        'pending',
        'processing',
        'processed',
        'invalid_signature',
        'duplicate_event',
        'failed'
    )),
    stripe_event_id    TEXT,
    event_type         TEXT,
    error_message      TEXT,
    processed_at       TIMESTAMPTZ
);

CREATE INDEX idx_stripe_webhook_inbox_pending ON stripe_webhook_inbox (created_at)
    WHERE status = 'pending';

CREATE INDEX idx_stripe_webhook_inbox_status ON stripe_webhook_inbox (status);

-- Idempotency: Stripe may retry the same event id; only one business processing.
CREATE TABLE stripe_processed_webhook_events (
    stripe_event_id TEXT PRIMARY KEY,
    inbox_id        UUID NOT NULL REFERENCES stripe_webhook_inbox (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
