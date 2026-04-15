package stripe

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	stripelib "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/webhook"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var _ service.PaymentGateway = (*PaymentGateway)(nil)

type PaymentGateway struct {
	secretKey     string
	webhookSecret string
}

func NewPaymentGateway(secretKey, webhookSecret string) *PaymentGateway {
	if secretKey != "" {
		stripelib.Key = secretKey
	}
	return &PaymentGateway{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
	}
}

// IsConfigured returns true when a real Stripe secret key is provided.
func (g *PaymentGateway) IsConfigured() bool {
	return g.secretKey != ""
}

// CreatePaymentIntent creates a Stripe PaymentIntent for the given amount in BRL.
// When no Stripe key is configured (development), returns a stub result so the
// checkout flow can be tested end-to-end without a real Stripe account.
func (g *PaymentGateway) CreatePaymentIntent(
	ctx context.Context,
	in service.CreatePaymentIntentInput,
) (*service.PaymentIntentResult, error) {
	if !g.IsConfigured() {
		stubID := "pi_dev_" + uuid.New().String()[:8]
		return &service.PaymentIntentResult{
			ID:           stubID,
			ClientSecret: stubID + "_secret_dev",
			Status:       "requires_payment_method",
		}, nil
	}

	meta := make(map[string]string, len(in.Metadata))
	for k, v := range in.Metadata {
		meta[k] = v
	}

	var pmTypes []string
	switch in.Mode {
	case service.PaymentIntentModePix:
		pmTypes = []string{"pix"}
	case service.PaymentIntentModeCard:
		pmTypes = []string{"card"}
	default:
		return nil, fmt.Errorf("stripe.CreatePaymentIntent: invalid payment mode %q", in.Mode)
	}

	params := &stripelib.PaymentIntentParams{
		Amount:             stripelib.Int64(in.AmountCents),
		Currency:           stripelib.String(string(stripelib.CurrencyBRL)),
		PaymentMethodTypes: stripelib.StringSlice(pmTypes),
		Metadata:           meta,
	}

	// Enable card installments (plan is chosen at confirm time on the client).
	if in.Mode == service.PaymentIntentModeCard && in.Installments > 1 {
		params.PaymentMethodOptions = &stripelib.PaymentIntentPaymentMethodOptionsParams{
			Card: &stripelib.PaymentIntentPaymentMethodOptionsCardParams{
				Installments: &stripelib.PaymentIntentPaymentMethodOptionsCardInstallmentsParams{
					Enabled: stripelib.Bool(true),
				},
			},
		}
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return nil, fmt.Errorf("stripe.CreatePaymentIntent: %w", err)
	}

	return &service.PaymentIntentResult{
		ID:           pi.ID,
		ClientSecret: pi.ClientSecret,
		Status:       string(pi.Status),
	}, nil
}

// ValidateWebhook verifies the Stripe webhook signature and returns the event type and raw data.
// In development mode (no webhook secret), it returns an error indicating Stripe is not configured.
func (g *PaymentGateway) ValidateWebhook(payload []byte, signature string) (string, []byte, error) {
	if g.webhookSecret == "" {
		return "", nil, fmt.Errorf("stripe webhook secret not configured")
	}
	event, err := webhook.ConstructEvent(payload, signature, g.webhookSecret)
	if err != nil {
		return "", nil, fmt.Errorf("stripe.ValidateWebhook: %w", err)
	}
	data, err := event.Data.Raw.MarshalJSON()
	if err != nil {
		return "", nil, fmt.Errorf("stripe.ValidateWebhook: marshal data: %w", err)
	}
	return string(event.Type), data, nil
}

// ParseStoredWebhook verifies the Stripe signature on a previously persisted payload (async worker).
// Timestamp tolerance is not enforced so backlog is safe; API version mismatches are ignored.
func (g *PaymentGateway) ParseStoredWebhook(payload []byte, signature string) (eventID, eventType string, data []byte, err error) {
	if g.webhookSecret == "" {
		return "", "", nil, fmt.Errorf("stripe webhook secret not configured")
	}
	ev, err := webhook.ConstructEventWithOptions(payload, signature, g.webhookSecret, webhook.ConstructEventOptions{
		IgnoreTolerance:          true,
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		return "", "", nil, fmt.Errorf("stripe.ParseStoredWebhook: %w", err)
	}
	raw, err := ev.Data.Raw.MarshalJSON()
	if err != nil {
		return "", "", nil, err
	}
	return ev.ID, string(ev.Type), raw, nil
}
