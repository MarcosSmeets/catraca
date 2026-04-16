-- At most one pending resale checkout per listing (prevents double spend of the same offer).
CREATE UNIQUE INDEX idx_orders_one_pending_resale_per_listing
    ON orders (resale_listing_id)
    WHERE kind = 'resale' AND status = 'PENDING' AND resale_listing_id IS NOT NULL;
