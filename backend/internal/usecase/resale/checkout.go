package resale

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	orderuc "github.com/marcos-smeets/catraca/backend/internal/usecase/order"
)

var ErrCannotBuyOwnListing = errors.New("cannot purchase your own resale listing")

var ErrInvalidResaleHold = errors.New("invalid or expired resale checkout hold")

type CreateResaleCheckoutInput struct {
	BuyerUserID    uuid.UUID
	ListingID      uuid.UUID
	HoldID         uuid.UUID
	Buyer          entity.BuyerDetails
	SuccessURLBase string
	CancelURLBase  string
}

type CreateResaleCheckoutOutput struct {
	URL string
}

type CreateResaleCheckoutUseCase struct {
	orders   repository.OrderRepository
	listings repository.ResaleListingRepository
	holds    repository.ResaleListingHoldRepository
	gw       service.PaymentGateway
}

func NewCreateResaleCheckoutUseCase(
	orders repository.OrderRepository,
	listings repository.ResaleListingRepository,
	holds repository.ResaleListingHoldRepository,
	gw service.PaymentGateway,
) *CreateResaleCheckoutUseCase {
	return &CreateResaleCheckoutUseCase{
		orders: orders, listings: listings, holds: holds, gw: gw,
	}
}

func (uc *CreateResaleCheckoutUseCase) Execute(ctx context.Context, in CreateResaleCheckoutInput) (*CreateResaleCheckoutOutput, error) {
	successURL := strings.TrimSpace(in.SuccessURLBase)
	cancelURL := strings.TrimSpace(in.CancelURLBase)
	if successURL == "" || cancelURL == "" {
		return nil, fmt.Errorf("success and cancel URLs are required")
	}
	if !uc.gw.IsConfigured() {
		return nil, orderuc.ErrStripeCheckoutDisabled
	}
	if in.HoldID == uuid.Nil {
		return nil, ErrInvalidResaleHold
	}

	hold, err := uc.holds.GetByID(ctx, in.HoldID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidResaleHold
		}
		return nil, err
	}
	if hold.UserID != in.BuyerUserID || hold.ResaleListingID != in.ListingID {
		return nil, ErrInvalidResaleHold
	}
	if hold.Status != resaleListingHoldStatusActive || !hold.ExpiresAt.After(time.Now()) {
		return nil, ErrInvalidResaleHold
	}

	l, err := uc.listings.GetByID(ctx, in.ListingID)
	if err != nil {
		return nil, err
	}
	if l.Status != string(entity.ResaleListingStatusActive) {
		return nil, repository.ErrNotFound
	}
	if l.SellerUserID == in.BuyerUserID {
		return nil, ErrCannotBuyOwnListing
	}
	pending, err := uc.listings.HasPendingOrderForListing(ctx, l.ID)
	if err != nil {
		return nil, err
	}
	if pending {
		return nil, fmt.Errorf("this listing already has a pending checkout")
	}

	if _, err := uc.holds.MarkConverted(ctx, in.HoldID, in.BuyerUserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidResaleHold
		}
		return nil, fmt.Errorf("mark hold converted: %w", err)
	}

	fee := ApplicationFeeCents(l.PriceCents)
	sellerPayout := l.PriceCents - fee
	if sellerPayout < 1 {
		sellerPayout = 1
	}
	listingID := l.ID
	o, err := entity.NewOrder(in.BuyerUserID, entity.OrderKindResale, nil, &listingID, l.PriceCents, "", in.Buyer)
	if err != nil {
		_ = uc.holds.RevertToActive(ctx, in.HoldID, in.BuyerUserID)
		return nil, err
	}
	o.SellerPayoutCents = &sellerPayout
	if err := uc.orders.Create(ctx, o); err != nil {
		_ = uc.holds.RevertToActive(ctx, in.HoldID, in.BuyerUserID)
		return nil, fmt.Errorf("create resale order: %w", err)
	}

	meta := map[string]string{
		"order_id":   o.ID.String(),
		"user_id":    o.UserID.String(),
		"order_kind": string(entity.OrderKindResale),
		"listing_id": l.ID.String(),
	}
	sess, err := uc.gw.CreateCheckoutSession(ctx, service.CheckoutSessionInput{
		AmountCents:                 l.PriceCents,
		Currency:                    "brl",
		SuccessURL:                  successURL,
		CancelURL:                   cancelURL,
		PaymentMethodTypes:          []string{"card"},
		PaymentIntentMetadata:       meta,
		ClientReferenceID:           o.ID.String(),
		ConnectDestinationAccountID: "",
		ApplicationFeeCents:         0,
		LineItemName:                "Revenda de ingresso",
	})
	if err != nil {
		_ = uc.orders.UpdateStatus(ctx, o.ID, entity.OrderStatusFailed)
		_ = uc.holds.RevertToActive(ctx, in.HoldID, in.BuyerUserID)
		return nil, fmt.Errorf("checkout session: %w", err)
	}
	return &CreateResaleCheckoutOutput{URL: sess.URL}, nil
}
