package stripe

import (
	"context"
	"fmt"

	stripelib "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/webhook"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var _ service.PaymentGateway = (*PaymentGateway)(nil)

type PaymentGateway struct {
	secretKey      string
	webhookSecret  string
}

func NewPaymentGateway(secretKey, webhookSecret string) *PaymentGateway {
	stripelib.Key = secretKey
	return &PaymentGateway{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
	}
}

// CreatePaymentIntent creates a Stripe PaymentIntent for the given amount in BRL.
// Supports card and PIX payment methods.
func (g *PaymentGateway) CreatePaymentIntent(
	ctx context.Context,
	amountCents int64,
	currency string,
	metadata map[string]string,
) (*service.PaymentIntentResult, error) {
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
func (g *PaymentGateway) ValidateWebhook(payload []byte, signature string) (string, []byte, error) {
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
