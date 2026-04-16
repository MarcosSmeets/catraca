package resale

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

type StartConnectInput struct {
	UserID     uuid.UUID
	ReturnURL  string
	RefreshURL string
}

type StartConnectOutput struct {
	URL string
}

type StartConnectUseCase struct {
	users repository.UserRepository
	gw    service.PaymentGateway
}

func NewStartConnectUseCase(users repository.UserRepository, gw service.PaymentGateway) *StartConnectUseCase {
	return &StartConnectUseCase{users: users, gw: gw}
}

func (uc *StartConnectUseCase) Execute(ctx context.Context, in StartConnectInput) (*StartConnectOutput, error) {
	if strings.TrimSpace(in.ReturnURL) == "" || strings.TrimSpace(in.RefreshURL) == "" {
		return nil, fmt.Errorf("return and refresh URLs are required")
	}
	if !uc.gw.IsConfigured() {
		return nil, fmt.Errorf("stripe is not configured")
	}
	u, err := uc.users.GetByID(ctx, in.UserID)
	if err != nil {
		return nil, err
	}
	accountID := strings.TrimSpace(u.StripeConnectAccountID)
	if accountID == "" {
		id, err := uc.gw.CreateConnectExpressAccount(ctx, u.Email)
		if err != nil {
			return nil, fmt.Errorf("create connect account: %w", err)
		}
		accountID = id
		if err := uc.users.UpdateStripeConnect(ctx, u.ID, accountID, false); err != nil {
			return nil, fmt.Errorf("save connect account: %w", err)
		}
	}
	url, err := uc.gw.CreateConnectAccountLink(ctx, accountID, in.ReturnURL, in.RefreshURL)
	if err != nil {
		return nil, fmt.Errorf("account link: %w", err)
	}
	return &StartConnectOutput{URL: url}, nil
}

type ConnectStatusOutput struct {
	ChargesEnabled           bool `json:"chargesEnabled"`
	DetailsSubmitted         bool `json:"detailsSubmitted"`
	StripeConnectAccountID   string `json:"stripeConnectAccountId,omitempty"`
}

type GetConnectStatusUseCase struct {
	users repository.UserRepository
	gw    service.PaymentGateway
}

func NewGetConnectStatusUseCase(users repository.UserRepository, gw service.PaymentGateway) *GetConnectStatusUseCase {
	return &GetConnectStatusUseCase{users: users, gw: gw}
}

func (uc *GetConnectStatusUseCase) Execute(ctx context.Context, userID uuid.UUID) (*ConnectStatusOutput, error) {
	if !uc.gw.IsConfigured() {
		return nil, fmt.Errorf("stripe is not configured")
	}
	u, err := uc.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	aid := strings.TrimSpace(u.StripeConnectAccountID)
	out := &ConnectStatusOutput{
		ChargesEnabled:         u.StripeConnectChargesEnabled,
		DetailsSubmitted:       false,
		StripeConnectAccountID: aid,
	}
	if aid == "" {
		return out, nil
	}
	st, err := uc.gw.GetConnectAccountStatus(ctx, aid)
	if err != nil {
		return nil, err
	}
	out.ChargesEnabled = st.ChargesEnabled
	out.DetailsSubmitted = st.DetailsSubmitted
	if err := uc.users.UpdateStripeConnect(ctx, u.ID, aid, st.ChargesEnabled); err != nil {
		return nil, fmt.Errorf("sync connect flags: %w", err)
	}
	return out, nil
}
