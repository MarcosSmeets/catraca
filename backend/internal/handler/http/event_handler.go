package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
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
	orgRepo      repository.OrganizationRepository
}

func NewEventHandler(
	listEventsUC *eventuc.ListEventsUseCase,
	getEventUC *eventuc.GetEventUseCase,
	listSeatsUC *eventuc.ListSeatsUseCase,
	orgRepo repository.OrganizationRepository,
) *EventHandler {
	return &EventHandler{
		listEventsUC: listEventsUC,
		getEventUC:   getEventUC,
		listSeatsUC:  listSeatsUC,
		orgRepo:      orgRepo,
	}
}

func (h *EventHandler) resolveOrgFromSlug(w http.ResponseWriter, r *http.Request) (*entity.Organization, bool) {
	slug := strings.TrimSpace(strings.ToLower(chi.URLParam(r, "slug")))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "organization slug is required")
		return nil, false
	}
	o, err := h.orgRepo.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "organization not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to resolve organization")
		}
		return nil, false
	}
	return o, true
}

func (h *EventHandler) ListByOrganization(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrgFromSlug(w, r)
	if !ok {
		return
	}
	input := eventuc.ListEventsInput{
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	}

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
	if q := r.URL.Query().Get("q"); q != "" {
		input.Q = &q
	}
	if df := r.URL.Query().Get("date_from"); df != "" {
		input.DateFrom = &df
	}
	if dt := r.URL.Query().Get("date_to"); dt != "" {
		input.DateTo = &dt
	}
	if s := r.URL.Query().Get("sort"); s != "" {
		input.Sort = &s
	}
	if mp := r.URL.Query().Get("min_price"); mp != "" {
		if v, err := strconv.ParseInt(mp, 10, 64); err == nil {
			input.MinPrice = &v
		}
	}
	if mp := r.URL.Query().Get("max_price"); mp != "" {
		if v, err := strconv.ParseInt(mp, 10, 64); err == nil {
			input.MaxPrice = &v
		}
	}

	limit := 20
	if lim := r.URL.Query().Get("limit"); lim != "" {
		if v, err := strconv.Atoi(lim); err == nil && v > 0 {
			limit = v
		}
	}
	input.Limit = limit

	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	input.Offset = (page - 1) * limit

	result, err := h.listEventsUC.Execute(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list events")
		return
	}

	resp := make([]dto.EventResponse, 0, len(result.Events))
	for _, e := range result.Events {
		resp = append(resp, toEventResponse(e))
	}

	writeJSON(w, http.StatusOK, dto.EventListResponse{
		Events: resp,
		Total:  result.Total,
		Page:   page,
		Limit:  limit,
	})
}

func (h *EventHandler) GetByOrganization(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrgFromSlug(w, r)
	if !ok {
		return
	}
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	e, err := h.getEventUC.Execute(r.Context(), eventuc.GetEventInput{
		EventID:            id,
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	})
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

func (h *EventHandler) ListSeatsByOrganization(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrgFromSlug(w, r)
	if !ok {
		return
	}
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	seats, err := h.listSeatsUC.Execute(r.Context(), eventuc.ListSeatsInput{
		EventID:            eventID,
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
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
