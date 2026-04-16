-- Amount owed to the original ticket holder after a resale (price minus platform fee); NULL for primary orders.
ALTER TABLE orders ADD COLUMN seller_payout_cents BIGINT NULL;
