package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
)

// AdminHandler handles venue and event management for admin/organizer users.
type AdminHandler struct {
	venueRepo   repository.VenueRepository
	eventRepo   repository.EventRepository
	seatRepo    repository.SeatRepository
	sectionRepo repository.SectionRepository
}

func NewAdminHandler(
	venueRepo repository.VenueRepository,
	eventRepo repository.EventRepository,
	seatRepo repository.SeatRepository,
	sectionRepo repository.SectionRepository,
) *AdminHandler {
	return &AdminHandler{
		venueRepo:   venueRepo,
		eventRepo:   eventRepo,
		seatRepo:    seatRepo,
		sectionRepo: sectionRepo,
	}
}

// ----- Venue -----

type CreateVenueRequest struct {
	Name     string `json:"name"`
	City     string `json:"city"`
	State    string `json:"state"`
	Capacity int    `json:"capacity"`
}

func (h *AdminHandler) ListVenues(w http.ResponseWriter, r *http.Request) {
	venues, err := h.venueRepo.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list venues")
		return
	}
	resp := make([]dto.VenueResponse, 0, len(venues))
	for _, v := range venues {
		resp = append(resp, dto.VenueResponse{
			ID:       v.ID.String(),
			Name:     v.Name,
			City:     v.City,
			State:    v.State,
			Capacity: v.Capacity,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"venues": resp})
}

func (h *AdminHandler) CreateVenue(w http.ResponseWriter, r *http.Request) {
	var req CreateVenueRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || req.City == "" || req.State == "" || req.Capacity <= 0 {
		writeError(w, http.StatusBadRequest, "name, city, state, and capacity are required")
		return
	}

	venue := &entity.Venue{
		ID:        uuid.New(),
		Name:      req.Name,
		City:      req.City,
		State:     req.State,
		Capacity:  req.Capacity,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.venueRepo.Create(r.Context(), venue); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create venue")
		return
	}
	writeJSON(w, http.StatusCreated, dto.VenueResponse{
		ID:       venue.ID.String(),
		Name:     venue.Name,
		City:     venue.City,
		State:    venue.State,
		Capacity: venue.Capacity,
	})
}

// ----- Events -----

type CreateEventRequest struct {
	Title             string   `json:"title"`
	Sport             string   `json:"sport"`
	League            string   `json:"league"`
	VenueID           string   `json:"venueId"`
	StartsAt          string   `json:"startsAt"`
	HomeTeam          string   `json:"homeTeam"`
	AwayTeam          string   `json:"awayTeam"`
	ImageURL          string   `json:"imageUrl"`
	ServiceFeePercent float64  `json:"serviceFeePercent"`
	VibeChips         []string `json:"vibeChips"`
}

func (h *AdminHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.eventRepo.List(r.Context(), repository.EventFilter{Limit: 100})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list events")
		return
	}
	resp := make([]dto.EventResponse, 0, len(events))
	for _, e := range events {
		resp = append(resp, toEventResponse(e))
	}
	writeJSON(w, http.StatusOK, map[string]any{"events": resp})
}

func (h *AdminHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var req CreateEventRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	venueID, err := uuid.Parse(req.VenueID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid venueId")
		return
	}
	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid startsAt format (use RFC3339)")
		return
	}

	event := &entity.Event{
		ID:                uuid.New(),
		Title:             req.Title,
		Sport:             entity.SportType(req.Sport),
		League:            req.League,
		VenueID:           venueID,
		StartsAt:          startsAt,
		Status:            entity.EventStatusDraft,
		HomeTeam:          req.HomeTeam,
		AwayTeam:          req.AwayTeam,
		ImageURL:          req.ImageURL,
		ServiceFeePercent: req.ServiceFeePercent,
		VibeChips:         req.VibeChips,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := h.eventRepo.Create(r.Context(), event); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create event")
		return
	}
	writeJSON(w, http.StatusCreated, toEventResponse(event))
}

func (h *AdminHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get event")
		return
	}

	var req CreateEventRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title != "" {
		event.Title = req.Title
	}
	if req.HomeTeam != "" {
		event.HomeTeam = req.HomeTeam
	}
	if req.AwayTeam != "" {
		event.AwayTeam = req.AwayTeam
	}
	if req.ImageURL != "" {
		event.ImageURL = req.ImageURL
	}
	if req.VibeChips != nil {
		event.VibeChips = req.VibeChips
	}
	event.UpdatedAt = time.Now()

	if err := h.eventRepo.Update(r.Context(), event); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update event")
		return
	}
	writeJSON(w, http.StatusOK, toEventResponse(event))
}

func (h *AdminHandler) PublishEvent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get event")
		return
	}

	if err := event.Publish(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.eventRepo.Update(r.Context(), event); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to publish event")
		return
	}
	writeJSON(w, http.StatusOK, toEventResponse(event))
}

// ----- Sections -----

type CreateSectionRequest struct {
	Name     string `json:"name"`
	ImageURL string `json:"imageUrl"`
}

type SectionResponse struct {
	ID       string `json:"id"`
	EventID  string `json:"eventId"`
	Name     string `json:"name"`
	ImageURL string `json:"imageUrl"`
}

func (h *AdminHandler) ListSections(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	sections, err := h.sectionRepo.ListByEventID(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sections")
		return
	}

	resp := make([]SectionResponse, 0, len(sections))
	for _, s := range sections {
		resp = append(resp, SectionResponse{
			ID:       s.ID.String(),
			EventID:  s.EventID.String(),
			Name:     s.Name,
			ImageURL: s.ImageURL,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"sections": resp})
}

func (h *AdminHandler) CreateSection(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	var req CreateSectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "section name is required")
		return
	}

	section, err := entity.NewSection(eventID, req.Name, req.ImageURL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.sectionRepo.Create(r.Context(), section); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create section")
		return
	}
	writeJSON(w, http.StatusCreated, SectionResponse{
		ID:       section.ID.String(),
		EventID:  section.EventID.String(),
		Name:     section.Name,
		ImageURL: section.ImageURL,
	})
}

// ----- Seats -----

type SeatInput struct {
	Section    string `json:"section"`
	Row        string `json:"row"`
	Number     string `json:"number"`
	PriceCents int64  `json:"priceCents"`
	Col        int    `json:"col"`
	RowIndex   int    `json:"rowIndex"`
}

type BatchCreateSeatsRequest struct {
	Seats []SeatInput `json:"seats"`
}

type SeatResponse struct {
	ID         string `json:"id"`
	EventID    string `json:"eventId"`
	Section    string `json:"section"`
	Row        string `json:"row"`
	Number     string `json:"number"`
	PriceCents int64  `json:"priceCents"`
	Status     string `json:"status"`
	Col        int    `json:"col"`
	RowIndex   int    `json:"rowIndex"`
}

func (h *AdminHandler) BatchCreateSeats(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event ID")
		return
	}

	var req BatchCreateSeatsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Seats) == 0 {
		writeError(w, http.StatusBadRequest, "at least one seat is required")
		return
	}

	seats := make([]*entity.Seat, 0, len(req.Seats))
	for _, input := range req.Seats {
		seat, err := entity.NewSeat(eventID, input.Section, input.Row, input.Number, input.PriceCents, input.Col, input.RowIndex)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		seats = append(seats, seat)
	}

	if err := h.seatRepo.CreateBatch(r.Context(), seats); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create seats")
		return
	}

	resp := make([]SeatResponse, 0, len(seats))
	for _, s := range seats {
		resp = append(resp, SeatResponse{
			ID:         s.ID.String(),
			EventID:    s.EventID.String(),
			Section:    s.Section,
			Row:        s.Row,
			Number:     s.Number,
			PriceCents: s.PriceCents,
			Status:     s.Status.String(),
			Col:        s.Col,
			RowIndex:   s.RowIndex,
		})
	}
	writeJSON(w, http.StatusCreated, map[string]any{"seats": resp})
}
