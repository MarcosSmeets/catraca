CREATE INDEX IF NOT EXISTS idx_orders_created_at_status ON orders(created_at, status);
