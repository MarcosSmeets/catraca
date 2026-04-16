-- name: GetFinancialTotals :one
SELECT
    COALESCE(SUM(o.total_cents) FILTER (WHERE o.status = 'PAID'), 0)::bigint                                                AS revenue_all_cents,
    COUNT(*) FILTER (WHERE o.status = 'PAID')::bigint                                                                       AS paid_orders_all,
    COALESCE(SUM(o.total_cents) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS revenue_30d_cents,
    COUNT(*) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days')::bigint                        AS paid_orders_30d
FROM orders o
WHERE (sqlc.narg('filter_organization_id')::uuid IS NULL OR EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON e.id = t.event_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.order_id = o.id AND v.organization_id = sqlc.narg('filter_organization_id')
));

-- name: GetTicketFinancials :one
SELECT
    COUNT(t.id) FILTER (WHERE o.status = 'PAID')::bigint                                                                           AS tickets_all,
    COUNT(t.id) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days')::bigint                            AS tickets_30d,
    COALESCE(SUM(s.price_cents) FILTER (WHERE o.status = 'PAID'), 0)::bigint                                                       AS base_cents_all,
    COALESCE(SUM(s.price_cents) FILTER (WHERE o.status = 'PAID' AND o.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint        AS base_cents_30d
FROM tickets t
JOIN orders o ON o.id = t.order_id
JOIN seats s ON s.id = t.seat_id
JOIN events e ON e.id = t.event_id
JOIN venues v ON v.id = e.venue_id
WHERE (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'));

-- name: GetDailyRevenue :many
SELECT
    DATE(o.created_at AT TIME ZONE 'America/Sao_Paulo')::text AS day,
    COALESCE(SUM(o.total_cents), 0)::bigint                   AS revenue_cents,
    COUNT(*)::bigint                                        AS orders_count
FROM orders o
WHERE o.status = 'PAID'
  AND o.created_at >= NOW() - INTERVAL '30 days'
  AND (sqlc.narg('filter_organization_id')::uuid IS NULL OR EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON e.id = t.event_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.order_id = o.id AND v.organization_id = sqlc.narg('filter_organization_id')
))
GROUP BY 1
ORDER BY 1;

-- name: GetTicketsBySection :many
SELECT
    s.section,
    COUNT(*)::bigint AS tickets_count
FROM tickets t
JOIN orders o ON o.id = t.order_id
JOIN seats s ON s.id = t.seat_id
JOIN events e ON e.id = t.event_id
JOIN venues v ON v.id = e.venue_id
WHERE o.status = 'PAID'
  AND (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
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
JOIN venues v ON v.id = e.venue_id
WHERE o.status = 'PAID'
  AND (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
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
  AND (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
GROUP BY e.id, e.title, e.home_team, e.away_team, v.name
ORDER BY tickets_sold DESC, e.created_at DESC
LIMIT 5;

-- name: GetTicketStatusCounts :many
SELECT
    t.status,
    COUNT(*)::bigint AS count
FROM tickets t
JOIN events e ON e.id = t.event_id
JOIN venues v ON v.id = e.venue_id
WHERE (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
GROUP BY t.status;

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
  AND (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
GROUP BY v.id, v.name, v.city, v.state, v.capacity
ORDER BY revenue_cents DESC, v.name;

-- name: GetOrderStatusCounts :many
SELECT
    o.status,
    COUNT(*)::bigint                                                                                  AS count_all,
    COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days')::bigint                          AS count_30d,
    COALESCE(SUM(o.total_cents), 0)::bigint                                                             AS amount_all_cents,
    COALESCE(SUM(o.total_cents) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint     AS amount_30d_cents
FROM orders o
WHERE (sqlc.narg('filter_organization_id')::uuid IS NULL OR EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON e.id = t.event_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.order_id = o.id AND v.organization_id = sqlc.narg('filter_organization_id')
))
GROUP BY o.status;

-- name: GetResaleMetrics :one
WITH listing_orders AS (
    SELECT
        l.status AS listing_status,
        o.id AS order_id,
        o.kind AS order_kind,
        o.status AS order_status,
        o.total_cents,
        o.created_at AS order_created_at
    FROM ticket_resale_listings l
    JOIN tickets t ON t.id = l.ticket_id
    JOIN events e ON e.id = t.event_id
    JOIN venues v ON v.id = e.venue_id
    LEFT JOIN orders o ON o.resale_listing_id = l.id
    WHERE (sqlc.narg('filter_organization_id')::uuid IS NULL OR v.organization_id = sqlc.narg('filter_organization_id'))
)
SELECT
    COALESCE(COUNT(*) FILTER (WHERE listing_status = 'active'), 0)::bigint AS active_listings,
    COALESCE(COUNT(*) FILTER (WHERE listing_status = 'cancelled'), 0)::bigint AS cancelled_listings,
    COALESCE(COUNT(*) FILTER (WHERE listing_status = 'sold'), 0)::bigint AS sold_listings_all,
    COALESCE(COUNT(*) FILTER (WHERE order_id IS NOT NULL AND order_kind = 'resale' AND order_status = 'PAID'), 0)::bigint AS resale_paid_orders_all,
    COALESCE(SUM(total_cents) FILTER (WHERE order_kind = 'resale' AND order_status = 'PAID'), 0)::bigint AS resale_revenue_all_cents,
    COALESCE(COUNT(*) FILTER (WHERE order_kind = 'resale' AND order_status = 'PAID' AND order_created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS resale_paid_orders_30d,
    COALESCE(SUM(total_cents) FILTER (WHERE order_kind = 'resale' AND order_status = 'PAID' AND order_created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS resale_revenue_30d_cents
FROM listing_orders;

-- name: GetOrgRevenueSummary :many
WITH order_org AS (
    SELECT o.id AS order_id,
           o.total_cents,
           o.status,
           o.created_at,
           v.organization_id
    FROM orders o
    JOIN tickets t ON t.order_id = o.id
    JOIN events e ON e.id = t.event_id
    JOIN venues v ON v.id = e.venue_id
    GROUP BY o.id, o.total_cents, o.status, o.created_at, v.organization_id
)
SELECT
    org.id AS organization_id,
    org.name AS organization_name,
    org.slug AS organization_slug,
    COALESCE(SUM(oo.total_cents) FILTER (WHERE oo.status = 'PAID' AND oo.created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS revenue_30d_cents,
    COALESCE(SUM(oo.total_cents) FILTER (WHERE oo.status = 'PAID'), 0)::bigint AS revenue_all_cents
FROM organizations org
LEFT JOIN order_org oo ON oo.organization_id = org.id
WHERE org.deleted_at IS NULL
GROUP BY org.id, org.name, org.slug
ORDER BY revenue_30d_cents DESC, org.name ASC;

-- name: CountActiveOrganizations :one
SELECT COUNT(*)::bigint FROM organizations WHERE deleted_at IS NULL;

-- name: CountActiveUsers :one
SELECT COUNT(*)::bigint FROM users WHERE deleted_at IS NULL;
