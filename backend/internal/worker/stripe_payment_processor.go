package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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
	orderRepo          repository.OrderRepository
	reservationRepo    repository.ReservationRepository
	seatRepo           repository.SeatRepository
	ticketRepo         repository.TicketRepository
	resaleListingRepo  repository.ResaleListingRepository
	orgRepo            repository.OrganizationRepository
	seatLocker         service.SeatLockerService
	sseHub             *sse.Hub
	paymentGW          service.PaymentGateway
}

func NewStripePaymentProcessor(
	orderRepo repository.OrderRepository,
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	ticketRepo repository.TicketRepository,
	resaleListingRepo repository.ResaleListingRepository,
	orgRepo repository.OrganizationRepository,
	seatLocker service.SeatLockerService,
	sseHub *sse.Hub,
	paymentGW service.PaymentGateway,
) *StripePaymentProcessor {
	return &StripePaymentProcessor{
		orderRepo:         orderRepo,
		reservationRepo:   reservationRepo,
		seatRepo:          seatRepo,
		ticketRepo:        ticketRepo,
		resaleListingRepo: resaleListingRepo,
		orgRepo:           orgRepo,
		seatLocker:        seatLocker,
		sseHub:            sseHub,
		paymentGW:         paymentGW,
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
	case string(stripelib.EventTypeCustomerSubscriptionCreated),
		string(stripelib.EventTypeCustomerSubscriptionUpdated):
		return p.handleCustomerSubscriptionUpdated(ctx, payload)
	case string(stripelib.EventTypeCustomerSubscriptionDeleted):
		return p.handleCustomerSubscriptionDeleted(ctx, payload)
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

// handleCheckoutSessionCompleted fulfills ticket orders, or syncs organization subscription state for Billing checkout.
func (p *StripePaymentProcessor) handleCheckoutSessionCompleted(ctx context.Context, payload []byte) error {
	var sess struct {
		ID            string            `json:"id"`
		Mode          string            `json:"mode"`
		PaymentStatus string            `json:"payment_status"`
		Metadata      map[string]string `json:"metadata"`
		Customer      json.RawMessage   `json:"customer"`
		Subscription  json.RawMessage   `json:"subscription"`
	}
	if err := json.Unmarshal(payload, &sess); err != nil {
		return fmt.Errorf("handleCheckoutSessionCompleted unmarshal: %w", err)
	}
	if sess.Metadata != nil && sess.Metadata["checkout_kind"] == "organization_subscription" &&
		sess.Mode == string(stripelib.CheckoutSessionModeSubscription) {
		return p.syncOrganizationFromSubscriptionCheckout(ctx, sess.Metadata, sess.Customer, sess.Subscription)
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

func parseStripeExpandableID(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil && s != "" {
		return s
	}
	var obj struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &obj); err == nil {
		return obj.ID
	}
	return ""
}

func parseSubscriptionPayload(raw json.RawMessage) (subID, status string, periodEnd *time.Time) {
	if len(raw) == 0 {
		return "", "", nil
	}
	var sub struct {
		ID               string `json:"id"`
		Status           string `json:"status"`
		CurrentPeriodEnd int64  `json:"current_period_end"`
	}
	if err := json.Unmarshal(raw, &sub); err != nil {
		return "", "", nil
	}
	subID = sub.ID
	status = sub.Status
	if sub.CurrentPeriodEnd > 0 {
		t := time.Unix(sub.CurrentPeriodEnd, 0).UTC()
		periodEnd = &t
	}
	return subID, status, periodEnd
}

func (p *StripePaymentProcessor) syncOrganizationFromSubscriptionCheckout(
	ctx context.Context,
	meta map[string]string,
	customerRaw, subscriptionRaw json.RawMessage,
) error {
	if p.orgRepo == nil {
		return nil
	}
	orgIDStr := meta["organization_id"]
	if orgIDStr == "" {
		log.Warn().Msg("organization subscription checkout missing organization_id")
		return nil
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return fmt.Errorf("sync org subscription: parse organization_id: %w", err)
	}
	customerID := parseStripeExpandableID(customerRaw)
	subID, status, periodEnd := parseSubscriptionPayload(subscriptionRaw)
	if subID == "" {
		subID = parseStripeExpandableID(subscriptionRaw)
	}
	if status == "" {
		status = entity.SubscriptionActive
	}
	if err := p.orgRepo.UpdateSubscription(ctx, orgID, customerID, subID, status, periodEnd); err != nil {
		return fmt.Errorf("sync org subscription from checkout: %w", err)
	}
	log.Info().Stringer("organization_id", orgID).Str("subscription_status", status).Msg("organization subscription synced from checkout")
	return nil
}

func (p *StripePaymentProcessor) handleCustomerSubscriptionUpdated(ctx context.Context, payload []byte) error {
	if p.orgRepo == nil {
		return nil
	}
	var sub struct {
		ID               string            `json:"id"`
		Status           string            `json:"status"`
		Customer         json.RawMessage   `json:"customer"`
		CurrentPeriodEnd int64             `json:"current_period_end"`
		Metadata         map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &sub); err != nil {
		return fmt.Errorf("handleCustomerSubscriptionUpdated unmarshal: %w", err)
	}
	orgIDStr := ""
	if sub.Metadata != nil {
		orgIDStr = sub.Metadata["organization_id"]
	}
	if orgIDStr == "" {
		log.Debug().Str("subscription_id", sub.ID).Msg("subscription event without organization_id metadata; skipping org sync")
		return nil
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return fmt.Errorf("handleCustomerSubscriptionUpdated parse organization_id: %w", err)
	}
	customerID := parseStripeExpandableID(sub.Customer)
	var periodEnd *time.Time
	if sub.CurrentPeriodEnd > 0 {
		t := time.Unix(sub.CurrentPeriodEnd, 0).UTC()
		periodEnd = &t
	}
	if err := p.orgRepo.UpdateSubscription(ctx, orgID, customerID, sub.ID, sub.Status, periodEnd); err != nil {
		return fmt.Errorf("handleCustomerSubscriptionUpdated persist: %w", err)
	}
	return nil
}

func (p *StripePaymentProcessor) handleCustomerSubscriptionDeleted(ctx context.Context, payload []byte) error {
	if p.orgRepo == nil {
		return nil
	}
	var sub struct {
		ID       string            `json:"id"`
		Customer json.RawMessage   `json:"customer"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(payload, &sub); err != nil {
		return fmt.Errorf("handleCustomerSubscriptionDeleted unmarshal: %w", err)
	}
	orgIDStr := ""
	if sub.Metadata != nil {
		orgIDStr = sub.Metadata["organization_id"]
	}
	if orgIDStr == "" {
		log.Debug().Str("subscription_id", sub.ID).Msg("subscription deleted without organization_id metadata; skipping org sync")
		return nil
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return fmt.Errorf("handleCustomerSubscriptionDeleted parse organization_id: %w", err)
	}
	customerID := parseStripeExpandableID(sub.Customer)
	if err := p.orgRepo.UpdateSubscription(ctx, orgID, customerID, sub.ID, entity.SubscriptionCanceled, nil); err != nil {
		return fmt.Errorf("handleCustomerSubscriptionDeleted persist: %w", err)
	}
	return nil
}

func (p *StripePaymentProcessor) fulfillPaidOrder(ctx context.Context, orderID uuid.UUID) error {
	order, err := p.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("fulfillPaidOrder get order: %w", err)
	}
	if order.Status == entity.OrderStatusPaid {
		return nil
	}
	if order.Kind == entity.OrderKindResale {
		return p.fulfillResalePaidOrder(ctx, order)
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
			// Payment succeeded — force-convert even if the reservation expired or was
			// already marked expired by the sweeper while the user was paying.
			log.Warn().Err(err).Stringer("reservation_id", resID).Str("status", string(res.Status)).Msg("convert reservation failed, force-converting (payment succeeded)")
			res.Status = entity.ReservationStatusConverted
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

		ticket, err := entity.NewTicket(order.ID, seat.EventID, seat.ID, order.UserID)
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

func (p *StripePaymentProcessor) fulfillResalePaidOrder(ctx context.Context, order *entity.Order) error {
	if order.ResaleListingID == nil {
		return fmt.Errorf("fulfillResalePaidOrder: missing resale listing id")
	}
	listing, err := p.resaleListingRepo.GetByID(ctx, *order.ResaleListingID)
	if err != nil {
		return fmt.Errorf("fulfillResalePaidOrder get listing: %w", err)
	}
	ticket, err := p.ticketRepo.GetByID(ctx, listing.TicketID)
	if err != nil {
		return fmt.Errorf("fulfillResalePaidOrder get ticket: %w", err)
	}

	// Idempotent replay: listing already sold and buyer holds the ticket — only ensure order is PAID.
	if listing.Status == string(entity.ResaleListingStatusSold) && ticket.HolderUserID == order.UserID {
		if order.Status != entity.OrderStatusPaid {
			o := *order
			if err := o.MarkPaid(); err != nil {
				return fmt.Errorf("fulfillResalePaidOrder mark paid: %w", err)
			}
			if err := p.orderRepo.UpdateStatus(ctx, o.ID, o.Status); err != nil {
				return fmt.Errorf("fulfillResalePaidOrder update order: %w", err)
			}
		}
		log.Info().Stringer("order_id", order.ID).Msg("resale order idempotently fulfilled")
		return nil
	}

	if listing.Status != string(entity.ResaleListingStatusActive) {
		return fmt.Errorf("fulfillResalePaidOrder: listing %s not active (status=%s)", listing.ID, listing.Status)
	}

	if err := p.resaleListingRepo.MarkSold(ctx, listing.ID); err != nil {
		return fmt.Errorf("fulfillResalePaidOrder mark listing sold: %w", err)
	}
	if err := p.ticketRepo.UpdateHolderUserID(ctx, listing.TicketID, order.UserID); err != nil {
		return fmt.Errorf("fulfillResalePaidOrder transfer holder: %w", err)
	}
	o := *order
	if err := o.MarkPaid(); err != nil {
		return fmt.Errorf("fulfillResalePaidOrder mark paid: %w", err)
	}
	if err := p.orderRepo.UpdateStatus(ctx, o.ID, o.Status); err != nil {
		return fmt.Errorf("fulfillResalePaidOrder update order: %w", err)
	}
	log.Info().Stringer("order_id", order.ID).Msg("resale order fulfilled successfully")
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

	if order.Kind == entity.OrderKindResale {
		return nil
	}

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
