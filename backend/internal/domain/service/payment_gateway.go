package service

import (
	"context"
)

type PaymentIntentResult struct {
	ID           string
	ClientSecret string
	Status       string
}

// PaymentIntentMode selects which Stripe payment method types are allowed on the PI.
type PaymentIntentMode string

const (
	PaymentIntentModeCard PaymentIntentMode = "card"
	PaymentIntentModePix  PaymentIntentMode = "pix"
)

// CreatePaymentIntentInput configures a PaymentIntent (amount, metadata, card vs pix, BR installments).
type CreatePaymentIntentInput struct {
	AmountCents   int64
	Currency      string
	Metadata      map[string]string
	Mode          PaymentIntentMode
	Installments  int // 1 = à vista; only used when Mode is card
}

// CheckoutSessionInput configures a Stripe-hosted Checkout Session (redirect).
type CheckoutSessionInput struct {
	AmountCents           int64
	Currency              string
	SuccessURL            string
	CancelURL             string
	PaymentMethodTypes    []string
	PaymentIntentMetadata map[string]string
	// ClientReferenceID is stored on the Checkout Session (e.g. internal order id for Dashboard reconciliation).
	ClientReferenceID string
}

// CheckoutSessionResult is the hosted Checkout Session URL for redirect.
type CheckoutSessionResult struct {
	ID  string
	URL string
}

type PaymentGateway interface {
	IsConfigured() bool
	CreatePaymentIntent(ctx context.Context, in CreatePaymentIntentInput) (*PaymentIntentResult, error)
	CreateCheckoutSession(ctx context.Context, in CheckoutSessionInput) (*CheckoutSessionResult, error)
	// GetPaymentIntent retrieves an existing PaymentIntent (including ClientSecret for resume).
	GetPaymentIntent(ctx context.Context, paymentIntentID string) (*PaymentIntentResult, error)
	// GetPaymentIntentMetadata loads a PaymentIntent by id (e.g. from charge.succeeded) to read metadata such as order_id.
	GetPaymentIntentMetadata(ctx context.Context, paymentIntentID string) (map[string]string, error)
	ValidateWebhook(payload []byte, signature string) (eventType string, data []byte, err error)
}
