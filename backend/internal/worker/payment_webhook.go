package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	stripelib "github.com/stripe/stripe-go/v76"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	"github.com/marcos-smeets/catraca/backend/internal/handler/http/sse"
)

// WebhookEvent is an internal representation of a parsed Stripe webhook.
type WebhookEvent struct {
	Type    string
	Payload []byte
}

// PaymentWebhookWorker processes Stripe webhook events asynchronously.
type PaymentWebhookWorker struct {
	events          chan WebhookEvent
	orderRepo       repository.OrderRepository
	reservationRepo repository.ReservationRepository
	seatRepo        repository.SeatRepository
	ticketRepo      repository.TicketRepository
	seatLocker      service.SeatLockerService
	sseHub          *sse.Hub
}

func NewPaymentWebhookWorker(
	orderRepo repository.OrderRepository,
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	ticketRepo repository.TicketRepository,
	seatLocker service.SeatLockerService,
	sseHub *sse.Hub,
) *PaymentWebhookWorker {
	return &PaymentWebhookWorker{
		events:          make(chan WebhookEvent, 128),
		orderRepo:       orderRepo,
		reservationRepo: reservationRepo,
		seatRepo:        seatRepo,
		ticketRepo:      ticketRepo,
		seatLocker:      seatLocker,
		sseHub:          sseHub,
	}
}

// Enqueue queues a parsed webhook event for processing.
func (w *PaymentWebhookWorker) Enqueue(evt WebhookEvent) {
	select {
	case w.events <- evt:
	default:
		log.Warn().Str("type", evt.Type).Msg("webhook queue full, dropping event")
	}
}

// Run starts the worker loop. It blocks until ctx is cancelled.
func (w *PaymentWebhookWorker) Run(ctx context.Context) error {
	log.Info().Msg("payment webhook worker started")
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("payment webhook worker stopped")
			return nil
		case evt := <-w.events:
			if err := w.process(ctx, evt); err != nil {
				log.Error().Err(err).Str("type", evt.Type).Msg("failed to process webhook event")
			}
		}
	}
}

func (w *PaymentWebhookWorker) process(ctx context.Context, evt WebhookEvent) error {
	switch evt.Type {
	case string(stripelib.EventTypePaymentIntentSucceeded):
		return w.handleSucceeded(ctx, evt.Payload)
	case string(stripelib.EventTypePaymentIntentPaymentFailed):
		return w.handleFailed(ctx, evt.Payload)
	default:
		log.Debug().Str("type", evt.Type).Msg("unhandled stripe event type")
	}
	return nil
}

type paymentIntentData struct {
	ID       string            `json:"id"`
	Metadata map[string]string `json:"metadata"`
}

func extractPaymentIntentID(payload []byte) (string, error) {
	var pi paymentIntentData
	if err := json.Unmarshal(payload, &pi); err != nil {
		return "", fmt.Errorf("unmarshal payment intent: %w", err)
	}
	return pi.ID, nil
}

func (w *PaymentWebhookWorker) findOrderByStripeID(ctx context.Context, stripePaymentID string) (*entity.Order, error) {
	// We find the order by scanning via stripe_payment_id.
	// In a production system we'd add an index; for now we rely on the small
	// number of PENDING orders and a helper query (not yet in sqlc).
	// As a workaround, the metadata carries order_id set during CreateOrder.
	return nil, fmt.Errorf("order lookup by stripe_payment_id not yet implemented via sqlc; use metadata order_id")
}

func (w *PaymentWebhookWorker) handleSucceeded(ctx context.Context, payload []byte) error {
	var pi struct {
		ID       string            `json:"id"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &pi); err != nil {
		return fmt.Errorf("handleSucceeded unmarshal: %w", err)
	}

	orderIDStr, ok := pi.Metadata["order_id"]
	if !ok {
		log.Warn().Str("stripe_id", pi.ID).Msg("payment_intent.succeeded missing order_id metadata")
		return nil
	}
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handleSucceeded parse order_id: %w", err)
	}

	order, err := w.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("handleSucceeded get order: %w", err)
	}
	if order.Status == entity.OrderStatusPaid {
		return nil // idempotent
	}
	if err := order.MarkPaid(); err != nil {
		return fmt.Errorf("handleSucceeded mark paid: %w", err)
	}
	if err := w.orderRepo.UpdateStatus(ctx, order.ID, order.Status); err != nil {
		return fmt.Errorf("handleSucceeded update order status: %w", err)
	}

	// Process each reservation → sell seat → create ticket
	for _, resID := range order.ReservationIDs {
		res, err := w.reservationRepo.GetByID(ctx, resID)
		if err != nil {
			log.Error().Err(err).Stringer("reservation_id", resID).Msg("get reservation failed")
			continue
		}
		if err := res.Convert(); err != nil {
			log.Warn().Err(err).Stringer("reservation_id", resID).Msg("convert reservation failed")
			continue
		}
		_ = w.reservationRepo.UpdateStatus(ctx, res.ID, res.Status)

		seat, err := w.seatRepo.GetByID(ctx, res.SeatID)
		if err != nil {
			log.Error().Err(err).Stringer("seat_id", res.SeatID).Msg("get seat failed")
			continue
		}
		if err := seat.Sell(); err != nil {
			log.Warn().Err(err).Stringer("seat_id", seat.ID).Msg("sell seat failed")
		}
		_ = w.seatRepo.UpdateStatus(ctx, seat.ID, entity.SeatStatusSold)

		ticket, err := entity.NewTicket(order.ID, seat.EventID, seat.ID)
		if err != nil {
			log.Error().Err(err).Msg("new ticket failed")
			continue
		}
		if err := w.ticketRepo.Create(ctx, ticket); err != nil {
			log.Error().Err(err).Msg("create ticket failed")
			continue
		}

		// Broadcast SSE update
		w.sseHub.Broadcast(seat.EventID, sse.SeatUpdateEvent{
			Type:    "seat_update",
			SeatID:  seat.ID.String(),
			Status:  entity.SeatStatusSold.String(),
			EventID: seat.EventID.String(),
		})
	}

	log.Info().Stringer("order_id", order.ID).Msg("order fulfilled successfully")
	return nil
}

func (w *PaymentWebhookWorker) handleFailed(ctx context.Context, payload []byte) error {
	var pi struct {
		ID       string            `json:"id"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &pi); err != nil {
		return fmt.Errorf("handleFailed unmarshal: %w", err)
	}

	orderIDStr, ok := pi.Metadata["order_id"]
	if !ok {
		return nil
	}
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handleFailed parse order_id: %w", err)
	}

	order, err := w.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("handleFailed get order: %w", err)
	}
	if order.Status != entity.OrderStatusPending {
		return nil
	}
	if err := order.MarkFailed(); err != nil {
		return err
	}
	_ = w.orderRepo.UpdateStatus(ctx, order.ID, order.Status)

	for _, resID := range order.ReservationIDs {
		res, err := w.reservationRepo.GetByID(ctx, resID)
		if err != nil {
			continue
		}
		seat, err := w.seatRepo.GetByID(ctx, res.SeatID)
		if err != nil {
			continue
		}
		_ = res.Expire()
		_ = w.reservationRepo.UpdateStatus(ctx, res.ID, res.Status)
		_ = seat.Release()
		_ = w.seatRepo.UpdateStatus(ctx, seat.ID, entity.SeatStatusAvailable)
		_ = w.seatLocker.Unlock(ctx, seat.EventID, seat.ID)

		w.sseHub.Broadcast(seat.EventID, sse.SeatUpdateEvent{
			Type:    "seat_update",
			SeatID:  seat.ID.String(),
			Status:  entity.SeatStatusAvailable.String(),
			EventID: seat.EventID.String(),
		})
	}
	return nil
}
