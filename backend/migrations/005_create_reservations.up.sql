CREATE TABLE reservations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seat_id    UUID NOT NULL REFERENCES seats(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CONVERTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_seat_status_expires ON reservations(seat_id, status, expires_at);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
