UPDATE events SET service_fee_percent = 8;

ALTER TABLE events
    ALTER COLUMN service_fee_percent SET DEFAULT 8;
