package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
	"github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	stripeinfra "github.com/marcos-smeets/catraca/backend/internal/infra/stripe"
)

const (
	stripeInboxBatchSize = 8
	stripeWorkerInterval = time.Second
)

// StripeInboxWorker pulls pending Stripe webhook rows from the DB, validates signatures, and runs the payment processor.
type StripeInboxWorker struct {
	pool      *pgxpool.Pool
	inboxRepo *postgres.StripeWebhookInboxRepository
	gateway   *stripeinfra.PaymentGateway
	processor *StripePaymentProcessor
}

func NewStripeInboxWorker(
	pool *pgxpool.Pool,
	inboxRepo *postgres.StripeWebhookInboxRepository,
	gateway *stripeinfra.PaymentGateway,
	processor *StripePaymentProcessor,
) *StripeInboxWorker {
	return &StripeInboxWorker{
		pool:      pool,
		inboxRepo: inboxRepo,
		gateway:   gateway,
		processor: processor,
	}
}

// Run polls every second until ctx is cancelled.
func (w *StripeInboxWorker) Run(ctx context.Context) error {
	t := time.NewTicker(stripeWorkerInterval)
	defer t.Stop()
	log.Info().Msg("stripe inbox worker started")
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stripe inbox worker stopped")
			return nil
		case <-t.C:
			w.drain(ctx)
		}
	}
}

func (w *StripeInboxWorker) drain(ctx context.Context) {
	rows, err := w.inboxRepo.ClaimPendingBatch(ctx, stripeInboxBatchSize)
	if err != nil {
		log.Error().Err(err).Msg("stripe inbox claim batch")
		return
	}
	for _, row := range rows {
		if err := w.processOne(ctx, row); err != nil {
			log.Error().Err(err).Stringer("inbox_id", row.ID).Msg("stripe inbox process row")
		}
	}
}

func (w *StripeInboxWorker) processOne(ctx context.Context, row postgres.ClaimedInboxRow) error {
	eventID, eventType, data, err := w.gateway.ParseStoredWebhook(row.RawBody, row.StripeSignature)
	if err != nil {
		return w.markInvalid(ctx, row.ID, err.Error())
	}

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	q := pgdb.New(w.pool).WithTx(tx)

	tag, err := tx.Exec(ctx, `
INSERT INTO stripe_processed_webhook_events (stripe_event_id, inbox_id)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM stripe_processed_webhook_events WHERE stripe_event_id = $1)
`, eventID, row.ID)
	if err != nil {
		return fmt.Errorf("reserve processed slot: %w", err)
	}
	if tag.RowsAffected() == 0 {
		if err := q.UpdateStripeWebhookInboxDuplicate(ctx, pgdb.UpdateStripeWebhookInboxDuplicateParams{
			ID:            row.ID,
			StripeEventID: textArg(eventID),
			EventType:     textArg(eventType),
		}); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	if err := w.processor.ProcessStripeEvent(ctx, eventType, data); err != nil {
		if _, delErr := tx.Exec(ctx, `DELETE FROM stripe_processed_webhook_events WHERE inbox_id = $1`, row.ID); delErr != nil {
			log.Error().Err(delErr).Stringer("inbox_id", row.ID).Msg("rollback processed marker after failure")
		}
		if err := q.UpdateStripeWebhookInboxFailed(ctx, pgdb.UpdateStripeWebhookInboxFailedParams{
			ID:            row.ID,
			StripeEventID: textArg(eventID),
			EventType:     textArg(eventType),
			ErrorMessage:  pgtype.Text{String: err.Error(), Valid: true},
		}); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	if err := q.UpdateStripeWebhookInboxProcessed(ctx, pgdb.UpdateStripeWebhookInboxProcessedParams{
		ID:            row.ID,
		StripeEventID: textArg(eventID),
		EventType:     textArg(eventType),
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (w *StripeInboxWorker) markInvalid(ctx context.Context, inboxID uuid.UUID, msg string) error {
	_, err := w.pool.Exec(ctx, `
UPDATE stripe_webhook_inbox
SET status = 'invalid_signature', error_message = $2, processed_at = now()
WHERE id = $1
`, inboxID, msg)
	return err
}

func textArg(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}
