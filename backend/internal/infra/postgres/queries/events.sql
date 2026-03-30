-- name: CreateEvent :one
INSERT INTO events (id, title, sport, league, venue_id, starts_at, status, service_fee_percent, home_team, away_team, image_url, vibe_chips)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetEventByID :one
SELECT
    e.*,
    v.id AS venue_id_2, v.name AS venue_name, v.city AS venue_city, v.state AS venue_state, v.capacity AS venue_capacity,
    COALESCE((SELECT MIN(s.price_cents) FROM seats s WHERE s.event_id = e.id AND s.status = 'AVAILABLE'), 0) AS min_price_cents,
    COALESCE((SELECT MAX(s.price_cents) FROM seats s WHERE s.event_id = e.id AND s.status = 'AVAILABLE'), 0) AS max_price_cents
FROM events e
JOIN venues v ON v.id = e.venue_id
WHERE e.id = $1 AND e.deleted_at IS NULL;

-- name: ListEvents :many
SELECT
    e.*,
    v.id AS venue_id_2, v.name AS venue_name, v.city AS venue_city, v.state AS venue_state, v.capacity AS venue_capacity,
    COALESCE((SELECT MIN(s.price_cents) FROM seats s WHERE s.event_id = e.id AND s.status = 'AVAILABLE'), 0) AS min_price_cents,
    COALESCE((SELECT MAX(s.price_cents) FROM seats s WHERE s.event_id = e.id AND s.status = 'AVAILABLE'), 0) AS max_price_cents
FROM events e
JOIN venues v ON v.id = e.venue_id
WHERE e.deleted_at IS NULL
    AND (sqlc.narg('sport')::VARCHAR IS NULL OR e.sport = sqlc.narg('sport'))
    AND (sqlc.narg('league')::VARCHAR IS NULL OR e.league = sqlc.narg('league'))
    AND (sqlc.narg('city')::VARCHAR IS NULL OR v.city = sqlc.narg('city'))
    AND (sqlc.narg('date')::DATE IS NULL OR DATE(e.starts_at) = sqlc.narg('date')::DATE)
ORDER BY e.starts_at ASC
LIMIT sqlc.arg('query_limit') OFFSET sqlc.arg('query_offset');

-- name: UpdateEvent :exec
UPDATE events
SET title = $2, sport = $3, league = $4, venue_id = $5, starts_at = $6, status = $7, service_fee_percent = $8, home_team = $9, away_team = $10, image_url = $11, vibe_chips = $12
WHERE id = $1 AND deleted_at IS NULL;
