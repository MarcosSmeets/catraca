-- Ticket holder (current owner; may differ from original order buyer after resale)
ALTER TABLE tickets ADD COLUMN holder_user_id UUID REFERENCES users(id);

UPDATE tickets t
SET holder_user_id = o.user_id
FROM orders o
WHERE o.id = t.order_id AND t.holder_user_id IS NULL;

ALTER TABLE tickets ALTER COLUMN holder_user_id SET NOT NULL;
CREATE INDEX idx_tickets_holder_user_id ON tickets(holder_user_id);

-- Seller Stripe Connect
ALTER TABLE users ADD COLUMN stripe_connect_account_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Resale listings
CREATE TABLE ticket_resale_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id),
    seller_user_id  UUID NOT NULL REFERENCES users(id),
    price_cents     BIGINT NOT NULL CHECK (price_cents > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'sold')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_resale_listings_event_lookup ON ticket_resale_listings (ticket_id);
CREATE INDEX idx_ticket_resale_listings_seller ON ticket_resale_listings (seller_user_id);

CREATE UNIQUE INDEX idx_ticket_resale_listings_one_active_per_ticket
    ON ticket_resale_listings (ticket_id)
    WHERE status = 'active';

CREATE TRIGGER set_updated_at_ticket_resale_listings
    BEFORE UPDATE ON ticket_resale_listings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Orders: primary vs resale
ALTER TABLE orders ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'primary'
    CHECK (kind IN ('primary', 'resale'));
ALTER TABLE orders ADD COLUMN resale_listing_id UUID REFERENCES ticket_resale_listings(id);
CREATE INDEX idx_orders_resale_listing_id ON orders(resale_listing_id) WHERE resale_listing_id IS NOT NULL;
