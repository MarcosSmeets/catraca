package organization

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var ErrSubscriptionCheckoutNotConfigured = errors.New("stripe subscription checkout is not configured")

type CreateSubscriptionCheckoutUseCase struct {
	orgRepo   repository.OrganizationRepository
	gw        service.PaymentGateway
	priceID   string
	successURL string
	cancelURL  string
}

func NewCreateSubscriptionCheckoutUseCase(
	orgRepo repository.OrganizationRepository,
	gw service.PaymentGateway,
	priceID, successURL, cancelURL string,
) *CreateSubscriptionCheckoutUseCase {
	return &CreateSubscriptionCheckoutUseCase{
		orgRepo:    orgRepo,
		gw:         gw,
		priceID:    strings.TrimSpace(priceID),
		successURL: strings.TrimSpace(successURL),
		cancelURL:  strings.TrimSpace(cancelURL),
	}
}

type CreateSubscriptionCheckoutInput struct {
	OrganizationID uuid.UUID
	CustomerEmail  string
}

func (uc *CreateSubscriptionCheckoutUseCase) Execute(ctx context.Context, in CreateSubscriptionCheckoutInput) (string, error) {
	if uc.priceID == "" || !uc.gw.IsConfigured() {
		return "", ErrSubscriptionCheckoutNotConfigured
	}
	if uc.successURL == "" || uc.cancelURL == "" {
		return "", ErrSubscriptionCheckoutNotConfigured
	}
	o, err := uc.orgRepo.GetByID(ctx, in.OrganizationID)
	if err != nil {
		return "", err
	}
	email := strings.TrimSpace(in.CustomerEmail)
	res, err := uc.gw.CreateOrganizationSubscriptionCheckout(ctx, service.OrganizationSubscriptionCheckoutInput{
		OrganizationID:   in.OrganizationID,
		PriceID:          uc.priceID,
		SuccessURL:       uc.successURL,
		CancelURL:        uc.cancelURL,
		StripeCustomerID: o.StripeCustomerID,
		CustomerEmail:    email,
	})
	if err != nil {
		return "", err
	}
	return res.URL, nil
}
