package http

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
	eventuc "github.com/marcos-smeets/catraca/backend/internal/usecase/event"
)

type EventHandler struct {
	listEventsUC *eventuc.ListEventsUseCase
	getEventUC   *eventuc.GetEventUseCase
	listSeatsUC  *eventuc.ListSeatsUseCase
}

func NewEventHandler(listEventsUC *eventuc.ListEventsUseCase, getEventUC *eventuc.GetEventUseCase, listSeatsUC *eventuc.ListSeatsUseCase) *EventHandler {
	return &EventHandler{
		listEventsUC: listEventsUC,
		getEventUC:   getEventUC,
		listSeatsUC:  listSeatsUC,
	}
}

func (h *EventHandler) List(w http.ResponseWriter, r *http.Request) {
	input := eventuc.ListEventsInput{}

	if s := r.URL.Query().Get("sport"); s != "" {
		sport := entity.SportType(s)
		input.Sport = &sport
	}
	if l := r.URL.Query().Get("league"); l != "" {
		input.League = &l
	}
	if c := r.URL.Query().Get("city"); c != "" {
		input.City = &c
	}
	if d := r.URL.Query().Get("date"); d != "" {
		input.Date = &d
	}
	if lim := r.URL.Query().Get("limit"); lim != "" {
		if v, err := strconv.Atoi(lim); err == nil {
			input.Limit = v
		}
	}
	if off := r.URL.Query().Get("offset"); off != "" {
		if v, err := strconv.Atoi(off); err == nil {
			input.Offset = v
		}
	}

	events, err := h.listEventsUC.Execute(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list events")
		return
	}

	resp := make([]dto.EventResponse, 0, len(events))
	for _, e := range events {
		resp = append(resp, toEventResponse(e))
	}

	writeJSON(w, http.StatusOK, dto.EventListResponse{Events: resp})
}

func (h *EventHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	e, err := h.getEventUC.Execute(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get event")
		return
	}

	writeJSON(w, http.StatusOK, toEventResponse(e))
}

func (h *EventHandler) ListSeats(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	seats, err := h.listSeatsUC.Execute(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list seats")
		return
	}

	resp := make([]dto.SeatResponse, 0, len(seats))
	for _, s := range seats {
		resp = append(resp, toSeatResponse(s))
	}

	writeJSON(w, http.StatusOK, resp)
}

func toEventResponse(e *entity.Event) dto.EventResponse {
	var venue dto.VenueResponse
	if e.Venue != nil {
		venue = dto.VenueResponse{
			ID:       e.Venue.ID.String(),
			Name:     e.Venue.Name,
			City:     e.Venue.City,
			State:    e.Venue.State,
			Capacity: e.Venue.Capacity,
		}
	}

	vibeChips := e.VibeChips
	if vibeChips == nil {
		vibeChips = []string{}
	}

	return dto.EventResponse{
		ID:                e.ID.String(),
		Title:             e.Title,
		Sport:             e.Sport.String(),
		League:            e.League,
		Venue:             venue,
		StartsAt:          e.StartsAt.Format(time.RFC3339),
		Status:            e.Status.String(),
		ServiceFeePercent: e.ServiceFeePercent,
		HomeTeam:          e.HomeTeam,
		AwayTeam:          e.AwayTeam,
		ImageURL:          e.ImageURL,
		MinPriceCents:     e.MinPriceCents,
		MaxPriceCents:     e.MaxPriceCents,
		VibeChips:         vibeChips,
	}
}

func toSeatResponse(s *entity.Seat) dto.SeatResponse {
	return dto.SeatResponse{
		ID:         s.ID.String(),
		EventID:    s.EventID.String(),
		Section:    s.Section,
		Row:        s.Row,
		Number:     s.Number,
		PriceCents: s.PriceCents,
		Status:     s.Status.String(),
		Col:        s.Col,
		RowIndex:   s.RowIndex,
	}
}
