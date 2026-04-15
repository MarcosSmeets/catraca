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
	ErrInvalidCheckoutMethod  = errors.New("paymentMethod must be card")
	ErrStripeCheckoutDisabled = errors.New("stripe is not configured")
)

type CreateCheckoutSessionInput struct {
	UserID         uuid.UUID
	OrderID        uuid.UUID
	PaymentMethod  string // must be "card"
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
	if pm != "card" {
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

	successURL := strings.TrimSpace(in.SuccessURLBase)
	cancelURL := strings.TrimSpace(in.CancelURLBase)
	if successURL == "" || cancelURL == "" {
		return nil, fmt.Errorf("checkout session: success and cancel URLs are required")
	}

	if !uc.paymentGateway.IsConfigured() {
		return nil, ErrStripeCheckoutDisabled
	}

	sess, err := uc.paymentGateway.CreateCheckoutSession(ctx, service.CheckoutSessionInput{
		AmountCents:        order.TotalCents,
		Currency:           "brl",
		SuccessURL:         successURL,
		CancelURL:          cancelURL,
		PaymentMethodTypes: []string{"card"},
		ClientReferenceID:  order.ID.String(),
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
