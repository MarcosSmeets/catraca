package order

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

type CreatePaymentIntentInput struct {
	UserID  uuid.UUID
	OrderID uuid.UUID
}

type CreatePaymentIntentOutput struct {
	ClientSecret string
	AmountCents  int64
}

type CreatePaymentIntentUseCase struct {
	orderRepo      repository.OrderRepository
	paymentGateway service.PaymentGateway
}

func NewCreatePaymentIntentUseCase(
	orderRepo repository.OrderRepository,
	paymentGateway service.PaymentGateway,
) *CreatePaymentIntentUseCase {
	return &CreatePaymentIntentUseCase{
		orderRepo:      orderRepo,
		paymentGateway: paymentGateway,
	}
}

func (uc *CreatePaymentIntentUseCase) Execute(ctx context.Context, in CreatePaymentIntentInput) (*CreatePaymentIntentOutput, error) {
	order, err := uc.orderRepo.GetByID(ctx, in.OrderID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("payment intent: get order: %w", err)
	}
	if order.UserID != in.UserID {
		return nil, repository.ErrNotFound
	}
	if order.Status != entity.OrderStatusPending {
		return nil, ErrOrderNotPending
	}

	if !uc.paymentGateway.IsConfigured() {
		return nil, ErrStripeCheckoutDisabled
	}

	// If the order already has a PaymentIntent, retrieve its client secret.
	if order.StripePaymentID != "" {
		existing, err := uc.paymentGateway.GetPaymentIntent(ctx, order.StripePaymentID)
		if err == nil && existing.Status != "canceled" {
			return &CreatePaymentIntentOutput{
				ClientSecret: existing.ClientSecret,
				AmountCents:  order.TotalCents,
			}, nil
		}
		// If retrieval failed or PI was canceled, create a new one below.
	}

	result, err := uc.paymentGateway.CreatePaymentIntent(ctx, service.CreatePaymentIntentInput{
		AmountCents:  order.TotalCents,
		Currency:     "brl",
		Mode:         service.PaymentIntentModeCard,
		Installments: 1, // installments enabled on the PI; plan selected client-side
		Metadata: map[string]string{
			"order_id": order.ID.String(),
			"user_id":  order.UserID.String(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("payment intent: create: %w", err)
	}

	// Persist the PaymentIntent ID so webhooks can match it.
	if err := uc.orderRepo.UpdateStripePaymentID(ctx, order.ID, result.ID); err != nil {
		return nil, fmt.Errorf("payment intent: update order: %w", err)
	}

	return &CreatePaymentIntentOutput{
		ClientSecret: result.ClientSecret,
		AmountCents:  order.TotalCents,
	}, nil
}
