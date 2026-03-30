CREATE TABLE tickets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id),
    event_id     UUID NOT NULL REFERENCES events(id),
    seat_id      UUID NOT NULL REFERENCES seats(id),
    qr_code      VARCHAR(255) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'CANCELLED')),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE UNIQUE INDEX idx_tickets_qr_code ON tickets(qr_code);
