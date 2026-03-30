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
	amountCents int64,
	currency string,
	metadata map[string]string,
) (*service.PaymentIntentResult, error) {
	if !g.IsConfigured() {
		// Development/test mode: return a deterministic stub payment intent.
		// The webhook worker will never fire for this, so orders stay PENDING
		// until manually marked paid (or use the test webhook endpoint).
		stubID := "pi_dev_" + uuid.New().String()[:8]
		return &service.PaymentIntentResult{
			ID:           stubID,
			ClientSecret: stubID + "_secret_dev",
			Status:       "requires_payment_method",
		}, nil
	}

	meta := make(map[string]string, len(metadata))
	for k, v := range metadata {
		meta[k] = v
	}

	params := &stripelib.PaymentIntentParams{
		Amount:   stripelib.Int64(amountCents),
		Currency: stripelib.String(string(stripelib.CurrencyBRL)),
		PaymentMethodTypes: stripelib.StringSlice([]string{
			"card",
			"pix",
		}),
		Metadata: meta,
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
