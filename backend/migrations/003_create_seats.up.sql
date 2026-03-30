CREATE TABLE seats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id),
    section     VARCHAR(100) NOT NULL,
    row         VARCHAR(10) NOT NULL,
    number      VARCHAR(10) NOT NULL,
    price_cents BIGINT NOT NULL CHECK (price_cents > 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED')),
    col         INT NOT NULL DEFAULT 0,
    row_index   INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seats_event_id_status ON seats(event_id, status);
CREATE UNIQUE INDEX idx_seats_event_section_row_number ON seats(event_id, section, row, number);
