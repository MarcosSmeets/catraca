CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    sport               VARCHAR(20) NOT NULL CHECK (sport IN ('FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'FUTSAL', 'ATHLETICS')),
    league              VARCHAR(100) NOT NULL,
    venue_id            UUID NOT NULL REFERENCES venues(id),
    starts_at           TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ON_SALE', 'SOLD_OUT', 'CANCELLED')),
    service_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (service_fee_percent >= 0 AND service_fee_percent <= 100),
    home_team           VARCHAR(100) NOT NULL,
    away_team           VARCHAR(100) NOT NULL,
    image_url           TEXT NOT NULL DEFAULT '',
    vibe_chips          TEXT[] DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_events_sport ON events(sport);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_venue_id ON events(venue_id);
