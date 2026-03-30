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
	venueRepo  repository.VenueRepository
	eventRepo  repository.EventRepository
	seatRepo   repository.SeatRepository
}

func NewAdminHandler(
	venueRepo repository.VenueRepository,
	eventRepo repository.EventRepository,
	seatRepo repository.SeatRepository,
) *AdminHandler {
	return &AdminHandler{
		venueRepo: venueRepo,
		eventRepo: eventRepo,
		seatRepo:  seatRepo,
	}
}

// ----- Venue -----

type CreateVenueRequest struct {
	Name     string `json:"name"`
	City     string `json:"city"`
	State    string `json:"state"`
	Capacity int    `json:"capacity"`
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
