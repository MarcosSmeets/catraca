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

type PaymentGateway interface {
	CreatePaymentIntent(ctx context.Context, in CreatePaymentIntentInput) (*PaymentIntentResult, error)
	ValidateWebhook(payload []byte, signature string) (eventType string, data []byte, err error)
}
