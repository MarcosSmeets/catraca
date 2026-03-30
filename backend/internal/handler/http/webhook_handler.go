package http

import (
	"io"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	"github.com/marcos-smeets/catraca/backend/internal/worker"
)

// WebhookHandler handles incoming Stripe webhook events.
type WebhookHandler struct {
	paymentGateway  service.PaymentGateway
	webhookWorker   *worker.PaymentWebhookWorker
}

func NewWebhookHandler(gateway service.PaymentGateway, webhookWorker *worker.PaymentWebhookWorker) *WebhookHandler {
	return &WebhookHandler{
		paymentGateway: gateway,
		webhookWorker:  webhookWorker,
	}
}

// HandleStripe validates the Stripe webhook signature and enqueues the event.
// Stripe requires a 200 response within 30 seconds; processing is async.
func (h *WebhookHandler) HandleStripe(w http.ResponseWriter, r *http.Request) {
	const maxBodyBytes = 65536
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	signature := r.Header.Get("Stripe-Signature")
	if signature == "" {
		writeError(w, http.StatusBadRequest, "missing Stripe-Signature header")
		return
	}

	eventType, data, err := h.paymentGateway.ValidateWebhook(payload, signature)
	if err != nil {
		log.Warn().Err(err).Msg("stripe webhook signature validation failed")
		writeError(w, http.StatusBadRequest, "invalid webhook signature")
		return
	}

	h.webhookWorker.Enqueue(worker.WebhookEvent{
		Type:    eventType,
		Payload: data,
	})

	w.WriteHeader(http.StatusOK)
}
