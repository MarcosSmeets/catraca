package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	eventuc "github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	orderuc "github.com/marcos-smeets/catraca/backend/internal/usecase/order"
	resaleuc "github.com/marcos-smeets/catraca/backend/internal/usecase/resale"
)

type ResaleHandler struct {
	createListing   *resaleuc.CreateResaleListingUseCase
	cancelListing   *resaleuc.CancelResaleListingUseCase
	listMine        *resaleuc.ListMyResaleListingsUseCase
	listByEvent     *resaleuc.ListEventResaleListingsUseCase
	listGlobal      *resaleuc.ListGlobalResaleListingsUseCase
	createCheckout  *resaleuc.CreateResaleCheckoutUseCase
	orgRepo         repository.OrganizationRepository
	getEventUC      *eventuc.GetEventUseCase
	stripeEnabled   bool
	checkoutSuccess string
	checkoutCancel  string
}

type ResaleHandlerDeps struct {
	CreateListing   *resaleuc.CreateResaleListingUseCase
	CancelListing   *resaleuc.CancelResaleListingUseCase
	ListMine        *resaleuc.ListMyResaleListingsUseCase
	ListByEvent     *resaleuc.ListEventResaleListingsUseCase
	ListGlobal      *resaleuc.ListGlobalResaleListingsUseCase
	CreateCheckout  *resaleuc.CreateResaleCheckoutUseCase
	OrganizationRepo repository.OrganizationRepository
	GetEventUC       *eventuc.GetEventUseCase
	StripeEnabled    bool
	CheckoutSuccess  string
	CheckoutCancel   string
}

func NewResaleHandler(d ResaleHandlerDeps) *ResaleHandler {
	return &ResaleHandler{
		createListing:   d.CreateListing,
		cancelListing:   d.CancelListing,
		listMine:        d.ListMine,
		listByEvent:     d.ListByEvent,
		listGlobal:      d.ListGlobal,
		createCheckout:  d.CreateCheckout,
		orgRepo:         d.OrganizationRepo,
		getEventUC:      d.GetEventUC,
		stripeEnabled:   d.StripeEnabled,
		checkoutSuccess: d.CheckoutSuccess,
		checkoutCancel:  d.CheckoutCancel,
	}
}

func (h *ResaleHandler) ListGlobalResaleListings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.listGlobal.Execute(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list resale listings")
		return
	}
	out := make([]dto.ResaleMarketplaceListingResponse, 0, len(rows))
	for _, row := range rows {
		out = append(out, dto.ResaleMarketplaceListingResponse{
			ID:               row.ID.String(),
			TicketID:         row.TicketID.String(),
			PriceCents:       row.PriceCents,
			Status:           row.Status,
			CreatedAt:        row.CreatedAt.UTC().Format(time.RFC3339),
			OrganizationSlug: row.OrganizationSlug,
			EventID:          row.EventID.String(),
			HomeTeam:         row.HomeTeam,
			AwayTeam:         row.AwayTeam,
			EventStartsAt:    row.EventStartsAt.UTC().Format(time.RFC3339),
			Section:          row.SeatSection,
			Row:              row.SeatRow,
			Number:           row.SeatNumber,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ResaleHandler) PostTicketResaleListing(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}
	var body dto.CreateResaleListingRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	l, err := h.createListing.Execute(r.Context(), resaleuc.CreateResaleListingInput{
		UserID:     claims.UserID,
		TicketID:   ticketID,
		PriceCents: body.PriceCents,
	})
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			writeError(w, http.StatusNotFound, "ticket not found")
		case errors.Is(err, resaleuc.ErrAlreadyListed):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, resaleuc.ErrPriceAboveCap):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, resaleuc.ErrTicketNotEligible):
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to create listing")
		}
		return
	}
	writeJSON(w, http.StatusCreated, toResaleListingResponseFromRepoPtr(l))
}

func (h *ResaleHandler) DeleteResaleListing(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid listing id")
		return
	}
	err = h.cancelListing.Execute(r.Context(), resaleuc.CancelResaleListingInput{
		UserID:    claims.UserID,
		ListingID: id,
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "listing not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ResaleHandler) ListMyResaleListings(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	list, err := h.listMine.Execute(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list listings")
		return
	}
	out := make([]dto.ResaleListingResponse, 0, len(list))
	for i := range list {
		out = append(out, toResaleListingResponseFromRepo(&list[i]))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ResaleHandler) ListResaleListingsByEventForOrganization(w http.ResponseWriter, r *http.Request) {
	if h.orgRepo == nil || h.getEventUC == nil {
		writeError(w, http.StatusInternalServerError, "server misconfiguration")
		return
	}
	slug := strings.TrimSpace(strings.ToLower(chi.URLParam(r, "slug")))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "organization slug is required")
		return
	}
	org, err := h.orgRepo.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "organization not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to resolve organization")
		}
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
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
	h.writeResaleListingsForEvent(w, r, eventID)
}

func (h *ResaleHandler) writeResaleListingsForEvent(w http.ResponseWriter, r *http.Request, eventID uuid.UUID) {
	rows, err := h.listByEvent.Execute(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list resale listings")
		return
	}
	out := make([]dto.ResaleListingResponse, 0, len(rows))
	for _, row := range rows {
		out = append(out, dto.ResaleListingResponse{
			ID:         row.ID.String(),
			TicketID:   row.TicketID.String(),
			PriceCents: row.PriceCents,
			Status:     row.Status,
			CreatedAt:  row.CreatedAt.Format(time.RFC3339),
			Section:    row.SeatSection,
			Row:        row.SeatRow,
			Number:     row.SeatNumber,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ResaleHandler) ListResaleListingsByEvent(w http.ResponseWriter, r *http.Request) {
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}
	h.writeResaleListingsForEvent(w, r, eventID)
}

func (h *ResaleHandler) PostResaleListingCheckout(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !h.stripeEnabled {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}
	listingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid listing id")
		return
	}
	var body dto.ResaleCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	buyer := entity.BuyerDetails{
		Name: body.BuyerName, Email: body.BuyerEmail, CPF: body.BuyerCpf, Phone: body.BuyerPhone,
		CEP: body.BuyerCep, Street: body.BuyerStreet, Neighborhood: body.BuyerNeighborhood,
		City: body.BuyerCity, State: body.BuyerState,
	}
	out, err := h.createCheckout.Execute(r.Context(), resaleuc.CreateResaleCheckoutInput{
		BuyerUserID:    claims.UserID,
		ListingID:      listingID,
		Buyer:          buyer,
		SuccessURLBase: h.checkoutSuccess,
		CancelURLBase:  h.checkoutCancel,
	})
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			writeError(w, http.StatusNotFound, "listing not found")
		case errors.Is(err, resaleuc.ErrCannotBuyOwnListing):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, orderuc.ErrStripeCheckoutDisabled):
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		default:
			writeError(w, http.StatusBadRequest, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, dto.CheckoutURLResponse{URL: out.URL})
}

func toResaleListingResponseFromRepoPtr(l *repository.ResaleListing) dto.ResaleListingResponse {
	return toResaleListingResponseFromRepo(l)
}

func toResaleListingResponseFromRepo(l *repository.ResaleListing) dto.ResaleListingResponse {
	if l == nil {
		return dto.ResaleListingResponse{}
	}
	return dto.ResaleListingResponse{
		ID:         l.ID.String(),
		TicketID:   l.TicketID.String(),
		PriceCents: l.PriceCents,
		Status:     l.Status,
		CreatedAt:  l.CreatedAt.UTC().Format(time.RFC3339),
	}
}
