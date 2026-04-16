CREATE TABLE resale_listing_holds (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resale_listing_id   UUID NOT NULL REFERENCES ticket_resale_listings(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    expires_at          TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'EXPIRED', 'CONVERTED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_resale_listing_holds_one_active_per_listing
    ON resale_listing_holds (resale_listing_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_resale_listing_holds_status_expires ON resale_listing_holds (status, expires_at);

CREATE TRIGGER set_updated_at_resale_listing_holds
    BEFORE UPDATE ON resale_listing_holds
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
