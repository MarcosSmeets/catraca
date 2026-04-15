package stripe

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	stripelib "github.com/stripe/stripe-go/v76"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/webhook"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var _ service.PaymentGateway = (*PaymentGateway)(nil)

// CheckoutSessionError is returned when the Stripe API rejects Checkout Session creation.
// The Message is safe to show to API clients.
type CheckoutSessionError struct {
	Message string
}

func (e *CheckoutSessionError) Error() string {
	return e.Message
}

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

// CreateCheckoutSession creates a hosted Checkout Session for card payments.
func (g *PaymentGateway) CreateCheckoutSession(
	ctx context.Context,
	in service.CheckoutSessionInput,
) (*service.CheckoutSessionResult, error) {
	if !g.IsConfigured() {
		return nil, fmt.Errorf("stripe not configured")
	}

	meta := make(map[string]string, len(in.PaymentIntentMetadata))
	for k, v := range in.PaymentIntentMetadata {
		meta[k] = v
	}

	lineItems := []*stripelib.CheckoutSessionLineItemParams{
		{
			Quantity: stripelib.Int64(1),
			PriceData: &stripelib.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripelib.String(strings.ToLower(in.Currency)),
				UnitAmount: stripelib.Int64(in.AmountCents),
				ProductData: &stripelib.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripelib.String("Ingressos"),
				},
			},
		},
	}

	params := &stripelib.CheckoutSessionParams{
		Mode:       stripelib.String(string(stripelib.CheckoutSessionModePayment)),
		SuccessURL: stripelib.String(in.SuccessURL),
		CancelURL:  stripelib.String(in.CancelURL),
		LineItems:  lineItems,
		// Session metadata lets checkout.session.completed webhooks carry order_id without an extra PI fetch.
		Metadata: meta,
		PaymentIntentData: &stripelib.CheckoutSessionPaymentIntentDataParams{
			Metadata: meta,
		},
		PaymentMethodTypes: stripelib.StringSlice(in.PaymentMethodTypes),
	}
	if in.ClientReferenceID != "" {
		params.ClientReferenceID = stripelib.String(in.ClientReferenceID)
	}

	// Card installments (BR credit) per Stripe Checkout docs.
	if paymentMethodTypesInclude(in.PaymentMethodTypes, "card") {
		params.PaymentMethodOptions = &stripelib.CheckoutSessionPaymentMethodOptionsParams{
			Card: &stripelib.CheckoutSessionPaymentMethodOptionsCardParams{
				Installments: &stripelib.CheckoutSessionPaymentMethodOptionsCardInstallmentsParams{
					Enabled: stripelib.Bool(true),
				},
			},
		}
	}

	// Portuguese Checkout for BRL card sessions (debit à vista / crédito parcelado escolhido na rede).
	if paymentMethodTypesInclude(in.PaymentMethodTypes, "card") && strings.EqualFold(strings.TrimSpace(in.Currency), "brl") {
		params.Locale = stripelib.String("pt-BR")
	}

	sess, err := checkoutsession.New(params)
	if err != nil {
		var sErr *stripelib.Error
		if errors.As(err, &sErr) && sErr != nil {
			msg := sErr.Msg
			if msg == "" {
				msg = err.Error()
			}
			return nil, &CheckoutSessionError{Message: msg}
		}
		return nil, fmt.Errorf("stripe.CreateCheckoutSession: %w", err)
	}

	return &service.CheckoutSessionResult{
		ID:  sess.ID,
		URL: sess.URL,
	}, nil
}

func paymentMethodTypesInclude(types []string, want string) bool {
	w := strings.ToLower(strings.TrimSpace(want))
	for _, t := range types {
		if strings.ToLower(strings.TrimSpace(t)) == w {
			return true
		}
	}
	return false
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

// GetPaymentIntentMetadata returns PaymentIntent metadata (e.g. order_id from Checkout-created intents).
func (g *PaymentGateway) GetPaymentIntentMetadata(ctx context.Context, paymentIntentID string) (map[string]string, error) {
	_ = ctx
	if !g.IsConfigured() {
		return nil, fmt.Errorf("stripe not configured")
	}
	id := strings.TrimSpace(paymentIntentID)
	if id == "" {
		return nil, fmt.Errorf("payment intent id required")
	}
	pi, err := paymentintent.Get(id, nil)
	if err != nil {
		return nil, fmt.Errorf("stripe.GetPaymentIntent: %w", err)
	}
	if pi.Metadata == nil {
		return map[string]string{}, nil
	}
	out := make(map[string]string, len(pi.Metadata))
	for k, v := range pi.Metadata {
		out[k] = v
	}
	return out, nil
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
