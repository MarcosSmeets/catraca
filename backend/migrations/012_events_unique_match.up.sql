-- Prevent duplicate games: the same match (sport + teams + kick-off time) must be unique.
-- The partial index excludes soft-deleted rows so a deleted event can be re-created.
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_match
    ON events (sport, home_team, away_team, starts_at)
    WHERE deleted_at IS NULL;
