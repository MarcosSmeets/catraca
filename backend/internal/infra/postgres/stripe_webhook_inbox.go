package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

// StripeWebhookInboxRepository persists raw Stripe webhook HTTP bodies for async processing.
type StripeWebhookInboxRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewStripeWebhookInboxRepository(pool *pgxpool.Pool) *StripeWebhookInboxRepository {
	return &StripeWebhookInboxRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

// InsertPending stores the raw request; the HTTP handler returns 200 immediately after this.
func (r *StripeWebhookInboxRepository) InsertPending(ctx context.Context, rawBody []byte, stripeSignature string) (uuid.UUID, error) {
	row, err := r.queries.InsertStripeWebhookInbox(ctx, pgdb.InsertStripeWebhookInboxParams{
		RawBody:         rawBody,
		StripeSignature: stripeSignature,
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("InsertStripeWebhookInbox: %w", err)
	}
	return row.ID, nil
}

// ClaimedInboxRow is one row moved from pending → processing.
type ClaimedInboxRow struct {
	ID               uuid.UUID
	RawBody          []byte
	StripeSignature  string
}

const claimPendingSQL = `
UPDATE stripe_webhook_inbox i
SET status = 'processing'
FROM (
	SELECT id FROM stripe_webhook_inbox
	WHERE status = 'pending'
	ORDER BY created_at ASC
	LIMIT $1
	FOR UPDATE SKIP LOCKED
) sub
WHERE i.id = sub.id
RETURNING i.id, i.raw_body, i.stripe_signature
`

// ClaimPendingBatch locks up to limit rows and marks them processing.
func (r *StripeWebhookInboxRepository) ClaimPendingBatch(ctx context.Context, limit int32) ([]ClaimedInboxRow, error) {
	rows, err := r.pool.Query(ctx, claimPendingSQL, limit)
	if err != nil {
		return nil, fmt.Errorf("ClaimPendingBatch: %w", err)
	}
	defer rows.Close()

	var out []ClaimedInboxRow
	for rows.Next() {
		var row ClaimedInboxRow
		if err := rows.Scan(&row.ID, &row.RawBody, &row.StripeSignature); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
