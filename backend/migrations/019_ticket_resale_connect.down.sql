DROP INDEX IF EXISTS idx_orders_resale_listing_id;
ALTER TABLE orders DROP COLUMN IF EXISTS resale_listing_id;
ALTER TABLE orders DROP COLUMN IF EXISTS kind;

DROP TRIGGER IF EXISTS set_updated_at_ticket_resale_listings ON ticket_resale_listings;
DROP TABLE IF EXISTS ticket_resale_listings;

ALTER TABLE users DROP COLUMN IF EXISTS stripe_connect_charges_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_connect_account_id;

DROP INDEX IF EXISTS idx_tickets_holder_user_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS holder_user_id;
