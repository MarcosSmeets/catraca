package service

import (
	"context"
)

type PaymentIntentResult struct {
	ID           string
	ClientSecret string
	Status       string
}

type PaymentGateway interface {
	CreatePaymentIntent(ctx context.Context, amountCents int64, currency string, metadata map[string]string) (*PaymentIntentResult, error)
	ValidateWebhook(payload []byte, signature string) (eventType string, data []byte, err error)
}
