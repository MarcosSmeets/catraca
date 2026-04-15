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

// StripePaymentProcessor runs domain side-effects for Stripe webhook event payloads.
type StripePaymentProcessor struct {
	orderRepo       repository.OrderRepository
	reservationRepo repository.ReservationRepository
	seatRepo        repository.SeatRepository
	ticketRepo      repository.TicketRepository
	seatLocker      service.SeatLockerService
	sseHub          *sse.Hub
	paymentGW       service.PaymentGateway
}

func NewStripePaymentProcessor(
	orderRepo repository.OrderRepository,
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	ticketRepo repository.TicketRepository,
	seatLocker service.SeatLockerService,
	sseHub *sse.Hub,
	paymentGW service.PaymentGateway,
) *StripePaymentProcessor {
	return &StripePaymentProcessor{
		orderRepo:       orderRepo,
		reservationRepo: reservationRepo,
		seatRepo:        seatRepo,
		ticketRepo:      ticketRepo,
		seatLocker:      seatLocker,
		sseHub:          sseHub,
		paymentGW:       paymentGW,
	}
}

// ProcessStripeEvent handles a validated Stripe event type and JSON data (PaymentIntent or Checkout Session object).
func (p *StripePaymentProcessor) ProcessStripeEvent(ctx context.Context, eventType string, payload []byte) error {
	switch eventType {
	case string(stripelib.EventTypePaymentIntentSucceeded):
		return p.handlePaymentIntentSucceeded(ctx, payload)
	case string(stripelib.EventTypeChargeSucceeded):
		return p.handleChargeSucceeded(ctx, payload)
	case string(stripelib.EventTypeCheckoutSessionCompleted):
		return p.handleCheckoutSessionCompleted(ctx, payload)
	case string(stripelib.EventTypePaymentIntentPaymentFailed):
		return p.handlePaymentIntentFailed(ctx, payload)
	default:
		log.Warn().Str("type", eventType).Msg("unhandled stripe event type")
	}
	return nil
}

func (p *StripePaymentProcessor) handlePaymentIntentSucceeded(ctx context.Context, payload []byte) error {
	var pi struct {
		ID       string            `json:"id"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &pi); err != nil {
		return fmt.Errorf("handlePaymentIntentSucceeded unmarshal: %w", err)
	}

	orderIDStr, ok := pi.Metadata["order_id"]
	if !ok {
		log.Warn().Str("stripe_id", pi.ID).Msg("payment_intent.succeeded missing order_id metadata")
		return nil
	}
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handlePaymentIntentSucceeded parse order_id: %w", err)
	}

	return p.fulfillPaidOrder(ctx, orderID)
}

// handleChargeSucceeded fulfills from charge.succeeded when order_id is on the Charge or on the related PaymentIntent metadata.
func (p *StripePaymentProcessor) handleChargeSucceeded(ctx context.Context, payload []byte) error {
	var ch struct {
		ID       string            `json:"id"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &ch); err != nil {
		return fmt.Errorf("handleChargeSucceeded unmarshal: %w", err)
	}

	orderIDStr := ""
	if ch.Metadata != nil {
		orderIDStr = ch.Metadata["order_id"]
	}

	if orderIDStr == "" && p.paymentGW.IsConfigured() {
		piID, err := parseChargePaymentIntentID(payload)
		if err != nil {
			return fmt.Errorf("handleChargeSucceeded payment_intent: %w", err)
		}
		if piID != "" {
			meta, err := p.paymentGW.GetPaymentIntentMetadata(ctx, piID)
			if err != nil {
				return fmt.Errorf("handleChargeSucceeded get PI metadata: %w", err)
			}
			orderIDStr = meta["order_id"]
		}
	}

	if orderIDStr == "" {
		log.Warn().Str("charge_id", ch.ID).Msg("charge.succeeded missing order_id on charge and payment intent metadata")
		return nil
	}

	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handleChargeSucceeded parse order_id: %w", err)
	}

	return p.fulfillPaidOrder(ctx, orderID)
}

func parseChargePaymentIntentID(payload []byte) (string, error) {
	var c struct {
		PaymentIntent json.RawMessage `json:"payment_intent"`
	}
	if err := json.Unmarshal(payload, &c); err != nil {
		return "", err
	}
	if len(c.PaymentIntent) == 0 {
		return "", nil
	}
	var idStr string
	if err := json.Unmarshal(c.PaymentIntent, &idStr); err == nil && idStr != "" {
		return idStr, nil
	}
	var expanded struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(c.PaymentIntent, &expanded); err != nil {
		return "", fmt.Errorf("parse payment_intent: %w", err)
	}
	return expanded.ID, nil
}

// handleCheckoutSessionCompleted fulfills when Checkout completes with a paid session and order_id on session metadata.
func (p *StripePaymentProcessor) handleCheckoutSessionCompleted(ctx context.Context, payload []byte) error {
	var sess struct {
		ID            string            `json:"id"`
		PaymentStatus string            `json:"payment_status"`
		Metadata      map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &sess); err != nil {
		return fmt.Errorf("handleCheckoutSessionCompleted unmarshal: %w", err)
	}
	if sess.PaymentStatus != "paid" {
		log.Debug().Str("session_id", sess.ID).Str("payment_status", sess.PaymentStatus).Msg("checkout.session.completed not paid; skipping fulfillment")
		return nil
	}
	orderIDStr, ok := sess.Metadata["order_id"]
	if !ok {
		log.Warn().Str("session_id", sess.ID).Msg("checkout.session.completed missing order_id metadata")
		return nil
	}
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handleCheckoutSessionCompleted parse order_id: %w", err)
	}
	return p.fulfillPaidOrder(ctx, orderID)
}

func (p *StripePaymentProcessor) fulfillPaidOrder(ctx context.Context, orderID uuid.UUID) error {
	order, err := p.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("fulfillPaidOrder get order: %w", err)
	}
	if order.Status == entity.OrderStatusPaid {
		return nil
	}
	if err := order.MarkPaid(); err != nil {
		return fmt.Errorf("fulfillPaidOrder mark paid: %w", err)
	}
	if err := p.orderRepo.UpdateStatus(ctx, order.ID, order.Status); err != nil {
		return fmt.Errorf("fulfillPaidOrder update order status: %w", err)
	}

	for _, resID := range order.ReservationIDs {
		res, err := p.reservationRepo.GetByID(ctx, resID)
		if err != nil {
			log.Error().Err(err).Stringer("reservation_id", resID).Msg("get reservation failed")
			continue
		}
		if err := res.Convert(); err != nil {
			log.Warn().Err(err).Stringer("reservation_id", resID).Msg("convert reservation failed")
			continue
		}
		_ = p.reservationRepo.UpdateStatus(ctx, res.ID, res.Status)

		seat, err := p.seatRepo.GetByID(ctx, res.SeatID)
		if err != nil {
			log.Error().Err(err).Stringer("seat_id", res.SeatID).Msg("get seat failed")
			continue
		}
		if err := seat.Sell(); err != nil {
			log.Warn().Err(err).Stringer("seat_id", seat.ID).Msg("sell seat failed")
		}
		_ = p.seatRepo.UpdateStatus(ctx, seat.ID, entity.SeatStatusSold)

		ticket, err := entity.NewTicket(order.ID, seat.EventID, seat.ID)
		if err != nil {
			log.Error().Err(err).Msg("new ticket failed")
			continue
		}
		if err := p.ticketRepo.Create(ctx, ticket); err != nil {
			log.Error().Err(err).Msg("create ticket failed")
			continue
		}

		p.sseHub.Broadcast(seat.EventID, sse.SeatUpdateEvent{
			Type:    "seat_update",
			SeatID:  seat.ID.String(),
			Status:  entity.SeatStatusSold.String(),
			EventID: seat.EventID.String(),
		})
	}

	log.Info().Stringer("order_id", order.ID).Msg("order fulfilled successfully")
	return nil
}

func (p *StripePaymentProcessor) handlePaymentIntentFailed(ctx context.Context, payload []byte) error {
	var pi struct {
		ID       string            `json:"id"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &pi); err != nil {
		return fmt.Errorf("handlePaymentIntentFailed unmarshal: %w", err)
	}

	orderIDStr, ok := pi.Metadata["order_id"]
	if !ok {
		return nil
	}
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("handlePaymentIntentFailed parse order_id: %w", err)
	}

	order, err := p.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("handlePaymentIntentFailed get order: %w", err)
	}
	if order.Status != entity.OrderStatusPending {
		return nil
	}
	if err := order.MarkFailed(); err != nil {
		return err
	}
	_ = p.orderRepo.UpdateStatus(ctx, order.ID, order.Status)

	for _, resID := range order.ReservationIDs {
		res, err := p.reservationRepo.GetByID(ctx, resID)
		if err != nil {
			continue
		}
		seat, err := p.seatRepo.GetByID(ctx, res.SeatID)
		if err != nil {
			continue
		}
		_ = res.Expire()
		_ = p.reservationRepo.UpdateStatus(ctx, res.ID, res.Status)
		_ = seat.Release()
		_ = p.seatRepo.UpdateStatus(ctx, seat.ID, entity.SeatStatusAvailable)
		_ = p.seatLocker.Unlock(ctx, seat.EventID, seat.ID)

		p.sseHub.Broadcast(seat.EventID, sse.SeatUpdateEvent{
			Type:    "seat_update",
			SeatID:  seat.ID.String(),
			Status:  entity.SeatStatusAvailable.String(),
			EventID: seat.EventID.String(),
		})
	}
	return nil
}
