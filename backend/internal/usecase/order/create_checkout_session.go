package order

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var (
	ErrOrderNotPending        = errors.New("order is not pending payment")
	ErrInvalidCheckoutMethod  = errors.New("paymentMethod must be card or pix")
	ErrStripeCheckoutDisabled = errors.New("stripe is not configured")
	// ErrPixAmountOutOfRange is returned when the order total is outside Stripe Pix limits for BRL (R$ 0,50–R$ 3.000).
	ErrPixAmountOutOfRange = errors.New("pix amount out of allowed range for brl")
)

// BRL Pix limits per Stripe (Brazil): https://docs.stripe.com/payments/pix
const (
	PixMinAmountCentsBRL int64 = 50       // R$ 0,50
	PixMaxAmountCentsBRL int64 = 300_000 // R$ 3.000,00
)

type CreateCheckoutSessionInput struct {
	UserID         uuid.UUID
	OrderID        uuid.UUID
	PaymentMethod  string // card | pix
	SuccessURLBase string
	CancelURLBase  string
}

type CreateCheckoutSessionOutput struct {
	URL string
}

type CreateCheckoutSessionUseCase struct {
	orderRepo      repository.OrderRepository
	paymentGateway service.PaymentGateway
}

func NewCreateCheckoutSessionUseCase(
	orderRepo repository.OrderRepository,
	paymentGateway service.PaymentGateway,
) *CreateCheckoutSessionUseCase {
	return &CreateCheckoutSessionUseCase{
		orderRepo:      orderRepo,
		paymentGateway: paymentGateway,
	}
}

func (uc *CreateCheckoutSessionUseCase) Execute(ctx context.Context, in CreateCheckoutSessionInput) (*CreateCheckoutSessionOutput, error) {
	pm := strings.ToLower(strings.TrimSpace(in.PaymentMethod))
	if pm != "card" && pm != "pix" {
		return nil, ErrInvalidCheckoutMethod
	}

	order, err := uc.orderRepo.GetByID(ctx, in.OrderID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("checkout session: get order: %w", err)
	}
	if order.UserID != in.UserID {
		return nil, repository.ErrNotFound
	}
	if order.Status != entity.OrderStatusPending {
		return nil, ErrOrderNotPending
	}

	var pmTypes []string
	if pm == "pix" {
		pmTypes = []string{"pix"}
	} else {
		pmTypes = []string{"card"}
	}

	successURL := strings.TrimSpace(in.SuccessURLBase)
	cancelURL := strings.TrimSpace(in.CancelURLBase)
	if successURL == "" || cancelURL == "" {
		return nil, fmt.Errorf("checkout session: success and cancel URLs are required")
	}

	if !uc.paymentGateway.IsConfigured() {
		return nil, ErrStripeCheckoutDisabled
	}

	if pm == "pix" {
		if order.TotalCents < PixMinAmountCentsBRL || order.TotalCents > PixMaxAmountCentsBRL {
			return nil, ErrPixAmountOutOfRange
		}
	}

	sess, err := uc.paymentGateway.CreateCheckoutSession(ctx, service.CheckoutSessionInput{
		AmountCents:  order.TotalCents,
		Currency:     "brl",
		SuccessURL:   successURL,
		CancelURL:    cancelURL,
		PaymentMethodTypes: pmTypes,
		ClientReferenceID: order.ID.String(),
		PaymentIntentMetadata: map[string]string{
			"order_id": order.ID.String(),
			"user_id":  order.UserID.String(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("checkout session: %w", err)
	}

	return &CreateCheckoutSessionOutput{URL: sess.URL}, nil
}
