-- name: GetFinancialTotals :one
SELECT
    COALESCE(SUM(o.total_cents) FILTER (WHERE o.status = 'PAID'), 0)::bigint                                                AS revenue_all_cents,
    COUNT(*) FILTER (WHERE o.status = 'PAID')::bigint                                                                       AS paid_orders_all,
    COALESCE(SUM(o.total_cents) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS revenue_30d_cents,
    COUNT(*) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days')::bigint                        AS paid_orders_30d
FROM orders o;

-- name: GetTicketFinancials :one
SELECT
    COUNT(t.id) FILTER (WHERE o.status = 'PAID')::bigint                                                                           AS tickets_all,
    COUNT(t.id) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days')::bigint                            AS tickets_30d,
    COALESCE(SUM(s.price_cents) FILTER (WHERE o.status = 'PAID'), 0)::bigint                                                       AS base_cents_all,
    COALESCE(SUM(s.price_cents) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint        AS base_cents_30d
FROM tickets t
JOIN orders o ON o.id = t.order_id
JOIN seats s ON s.id = t.seat_id;

-- name: GetDailyRevenue :many
SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo')::text AS day,
    COALESCE(SUM(total_cents), 0)::bigint                   AS revenue_cents,
    COUNT(*)::bigint                                        AS orders_count
FROM orders
WHERE status = 'PAID'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- name: GetTicketsBySection :many
SELECT
    s.section,
    COUNT(*)::bigint AS tickets_count
FROM tickets t
JOIN orders o ON o.id = t.order_id
JOIN seats s ON s.id = t.seat_id
WHERE o.status = 'PAID'
GROUP BY s.section
ORDER BY tickets_count DESC
LIMIT 10;

-- name: GetTicketsBySport :many
SELECT
    e.sport,
    COUNT(*)::bigint AS tickets_count
FROM tickets t
JOIN orders o ON o.id = t.order_id
JOIN events e ON e.id = t.event_id
WHERE o.status = 'PAID'
GROUP BY e.sport
ORDER BY tickets_count DESC;

-- name: GetTopEventsByTickets :many
SELECT
    e.id                                                                                      AS event_id,
    e.title,
    e.home_team,
    e.away_team,
    v.name                                                                                    AS venue_name,
    COUNT(CASE WHEN o.status = 'PAID' THEN t.id END)::bigint                                  AS tickets_sold,
    COALESCE(SUM(CASE WHEN o.status = 'PAID' THEN s.price_cents ELSE 0 END), 0)::bigint       AS revenue_cents
FROM events e
JOIN venues v ON v.id = e.venue_id
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN orders o ON o.id = t.order_id
LEFT JOIN seats s ON s.id = t.seat_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.home_team, e.away_team, v.name
ORDER BY tickets_sold DESC, e.created_at DESC
LIMIT 5;

-- name: GetTicketStatusCounts :many
SELECT
    status,
    COUNT(*)::bigint AS count
FROM tickets
GROUP BY status;

-- name: GetStadiumSummary :many
SELECT
    v.id,
    v.name,
    v.city,
    v.state,
    v.capacity,
    COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL)::bigint                                            AS event_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL)::bigint                                            AS total_seats,
    COUNT(DISTINCT t.id) FILTER (WHERE o.status = 'PAID')::bigint                                           AS tickets_sold,
    COALESCE(SUM(s.price_cents) FILTER (WHERE o.status = 'PAID' AND t.id IS NOT NULL), 0)::bigint           AS revenue_cents
FROM venues v
LEFT JOIN events e ON e.venue_id = v.id AND e.deleted_at IS NULL
LEFT JOIN seats s ON s.event_id = e.id
LEFT JOIN tickets t ON t.seat_id = s.id
LEFT JOIN orders o ON o.id = t.order_id
WHERE v.deleted_at IS NULL
GROUP BY v.id, v.name, v.city, v.state, v.capacity
ORDER BY revenue_cents DESC, v.name;

-- name: GetOrderStatusCounts :many
SELECT
    status,
    COUNT(*)::bigint                                                                                  AS count_all,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::bigint                          AS count_30d,
    COALESCE(SUM(total_cents), 0)::bigint                                                             AS amount_all_cents,
    COALESCE(SUM(total_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::bigint     AS amount_30d_cents
FROM orders
GROUP BY status;
