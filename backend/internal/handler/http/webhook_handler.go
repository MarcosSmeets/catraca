package http

import (
	"io"
	"net/http"

	"github.com/rs/zerolog/log"

	postgresinfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
)

// WebhookHandler stores raw Stripe webhook HTTP payloads for async validation and processing.
type WebhookHandler struct {
	inbox *postgresinfra.StripeWebhookInboxRepository
}

func NewWebhookHandler(inbox *postgresinfra.StripeWebhookInboxRepository) *WebhookHandler {
	return &WebhookHandler{inbox: inbox}
}

// HandleStripe persists the raw body and Stripe-Signature header, then returns 200 immediately.
// Validation and domain logic run in StripeInboxWorker (poll).
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

	id, err := h.inbox.InsertPending(r.Context(), payload, signature)
	if err != nil {
		log.Error().Err(err).Msg("stripe webhook inbox insert failed")
		writeError(w, http.StatusInternalServerError, "failed to store webhook")
		return
	}

	log.Debug().Stringer("inbox_id", id).Msg("stripe webhook stored")
	w.WriteHeader(http.StatusOK)
}
