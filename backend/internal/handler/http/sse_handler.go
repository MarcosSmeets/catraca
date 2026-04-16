package http

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/http/sse"
	eventuc "github.com/marcos-smeets/catraca/backend/internal/usecase/event"
)

// SSEHandler serves the seat availability stream for a given event within an organization.
type SSEHandler struct {
	hub       *sse.Hub
	orgRepo   repository.OrganizationRepository
	getEventUC *eventuc.GetEventUseCase
}

func NewSSEHandler(hub *sse.Hub, orgRepo repository.OrganizationRepository, getEventUC *eventuc.GetEventUseCase) *SSEHandler {
	return &SSEHandler{
		hub:        hub,
		orgRepo:    orgRepo,
		getEventUC: getEventUC,
	}
}

func (h *SSEHandler) SeatStreamForOrganization(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	org, err := h.orgRepo.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "organization not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to resolve organization")
		}
		return
	}

	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	_, err = h.getEventUC.Execute(r.Context(), eventuc.GetEventInput{
		EventID:            eventID,
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to load event")
		}
		return
	}

	h.hub.ServeHTTP(w, r, eventID)
}

// SeatStream streams seat updates for a legacy flat /events/{id}/seats/stream route.
func (h *SSEHandler) SeatStream(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}
	if _, err := h.getEventUC.Execute(r.Context(), eventuc.GetEventInput{
		EventID:            eventID,
		TenantBuyerCatalog: false,
	}); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load event")
		return
	}
	h.hub.ServeHTTP(w, r, eventID)
}
