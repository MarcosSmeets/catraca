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
	"github.com/marcos-smeets/catraca/backend/internal/handler/http/sse"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	stripeinfra "github.com/marcos-smeets/catraca/backend/internal/infra/stripe"
	orderuc "github.com/marcos-smeets/catraca/backend/internal/usecase/order"
	reservationuc "github.com/marcos-smeets/catraca/backend/internal/usecase/reservation"
	ticketuc "github.com/marcos-smeets/catraca/backend/internal/usecase/ticket"
)

// UserHandler handles profile, orders, tickets, and reservation routes.
type UserHandler struct {
	userRepo                  repository.UserRepository
	sseHub                    *sse.Hub
	reserveSeatUC             *reservationuc.ReserveSeatUseCase
	releaseSeatUC             *reservationuc.ReleaseSeatUseCase
	createOrderUC             *orderuc.CreateOrderUseCase
	createCheckoutSessionUC   *orderuc.CreateCheckoutSessionUseCase
	createPaymentIntentUC     *orderuc.CreatePaymentIntentUseCase
	getOrderUC                *orderuc.GetOrderUseCase
	listOrdersUC              *orderuc.ListOrdersUseCase
	listTicketsUC             *ticketuc.ListTicketsUseCase
	getTicketUC               *ticketuc.GetTicketUseCase
	stripeEnabled             bool
	checkoutSuccessURL        string
	checkoutCancelURL         string
}

// UserDeps holds all dependencies for UserHandler.
type UserDeps struct {
	UserRepo                  repository.UserRepository
	SSEHub                    *sse.Hub
	ReserveSeatUC             *reservationuc.ReserveSeatUseCase
	ReleaseSeatUC             *reservationuc.ReleaseSeatUseCase
	CreateOrderUC             *orderuc.CreateOrderUseCase
	CreateCheckoutSessionUC   *orderuc.CreateCheckoutSessionUseCase
	CreatePaymentIntentUC     *orderuc.CreatePaymentIntentUseCase
	GetOrderUC                *orderuc.GetOrderUseCase
	ListOrdersUC              *orderuc.ListOrdersUseCase
	ListTicketsUC             *ticketuc.ListTicketsUseCase
	GetTicketUC               *ticketuc.GetTicketUseCase
	StripeEnabled             bool
	CheckoutSuccessURL        string
	CheckoutCancelURL         string
}

func NewUserHandler(deps UserDeps) *UserHandler {
	return &UserHandler{
		userRepo:                  deps.UserRepo,
		sseHub:                    deps.SSEHub,
		reserveSeatUC:             deps.ReserveSeatUC,
		releaseSeatUC:             deps.ReleaseSeatUC,
		createOrderUC:             deps.CreateOrderUC,
		createCheckoutSessionUC:   deps.CreateCheckoutSessionUC,
		createPaymentIntentUC:     deps.CreatePaymentIntentUC,
		getOrderUC:                deps.GetOrderUC,
		listOrdersUC:              deps.ListOrdersUC,
		listTicketsUC:             deps.ListTicketsUC,
		getTicketUC:               deps.GetTicketUC,
		stripeEnabled:             deps.StripeEnabled,
		checkoutSuccessURL:        deps.CheckoutSuccessURL,
		checkoutCancelURL:         deps.CheckoutCancelURL,
	}
}

// ----- Profile -----

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get profile")
		return
	}
	writeJSON(w, http.StatusOK, dto.ProfileResponse{
		ID:        user.ID.String(),
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		Role:      string(user.Role),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req dto.UpdateProfileRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get profile")
		return
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if err := h.userRepo.Update(r.Context(), user); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}
	writeJSON(w, http.StatusOK, dto.ProfileResponse{
		ID:        user.ID.String(),
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		Role:      string(user.Role),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	})
}

// ----- Reservations -----

func (h *UserHandler) CreateReservation(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req dto.CreateReservationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.EventID == "" || len(req.SeatIDs) == 0 {
		writeError(w, http.StatusBadRequest, "eventId and at least one seatId are required")
		return
	}

	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid eventId")
		return
	}

	seatIDs := make([]uuid.UUID, 0, len(req.SeatIDs))
	for _, s := range req.SeatIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid seatId: "+s)
			return
		}
		seatIDs = append(seatIDs, id)
	}

	output, err := h.reserveSeatUC.Execute(r.Context(), reservationuc.ReserveSeatInput{
		UserID:  claims.UserID,
		EventID: eventID,
		SeatIDs: seatIDs,
	})
	if err != nil {
		switch {
		case errors.Is(err, reservationuc.ErrSeatNotAvailable):
			writeError(w, http.StatusConflict, "one or more seats are not available")
		case errors.Is(err, reservationuc.ErrSeatAlreadyLocked):
			writeError(w, http.StatusConflict, "one or more seats are already reserved by another user")
		case errors.Is(err, reservationuc.ErrMaxSeatsExceeded):
			writeError(w, http.StatusBadRequest, "cannot reserve more than 6 seats per order")
		default:
			writeError(w, http.StatusInternalServerError, "failed to create reservation")
		}
		return
	}

	resResp := make([]dto.ReservationResponse, 0, len(output.Reservations))
	var expiresAt string
	for _, res := range output.Reservations {
		resResp = append(resResp, dto.ReservationResponse{
			ID:        res.ID.String(),
			SeatID:    res.SeatID.String(),
			UserID:    res.UserID.String(),
			ExpiresAt: res.ExpiresAt.Format(time.RFC3339),
			Status:    res.Status.String(),
		})
		expiresAt = res.ExpiresAt.Format(time.RFC3339)
		// Broadcast seat status change to SSE subscribers
		if h.sseHub != nil {
			h.sseHub.Broadcast(eventID, sse.SeatUpdateEvent{
				Type:    "seat_update",
				SeatID:  res.SeatID.String(),
				Status:  "RESERVED",
				EventID: eventID.String(),
			})
		}
	}

	writeJSON(w, http.StatusCreated, dto.CreateReservationResponse{
		Reservations: resResp,
		ExpiresAt:    expiresAt,
	})
}

func (h *UserHandler) DeleteReservation(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	resID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid reservation ID")
		return
	}

	var eventID uuid.UUID
	if eventIDStr := r.URL.Query().Get("eventId"); eventIDStr != "" {
		eventID, _ = uuid.Parse(eventIDStr)
	}

	err = h.releaseSeatUC.Execute(r.Context(), reservationuc.ReleaseSeatInput{
		UserID:        claims.UserID,
		ReservationID: resID,
		EventID:       eventID,
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "reservation not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ----- Orders -----

func (h *UserHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req dto.CreateOrderRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ReservationIDs) == 0 {
		writeError(w, http.StatusBadRequest, "at least one reservationId is required")
		return
	}

	resIDs := make([]uuid.UUID, 0, len(req.ReservationIDs))
	for _, s := range req.ReservationIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid reservationId: "+s)
			return
		}
		resIDs = append(resIDs, id)
	}

	output, err := h.createOrderUC.Execute(r.Context(), orderuc.CreateOrderInput{
		UserID:         claims.UserID,
		ReservationIDs: resIDs,
	})
	if err != nil {
		switch {
		case errors.Is(err, orderuc.ErrReservationNotFound):
			writeError(w, http.StatusNotFound, "reservation not found")
		case errors.Is(err, orderuc.ErrReservationExpired):
			writeError(w, http.StatusGone, "reservation has expired")
		case errors.Is(err, orderuc.ErrReservationWrongUser):
			writeError(w, http.StatusForbidden, "reservation does not belong to you")
		default:
			writeError(w, http.StatusInternalServerError, "failed to create order")
		}
		return
	}

	writeJSON(w, http.StatusCreated, dto.CreateOrderResponse{
		OrderID:       output.Order.ID.String(),
		TotalCents:    output.Order.TotalCents,
		StripeEnabled: h.stripeEnabled,
	})
}

func (h *UserHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid order ID")
		return
	}

	var req dto.CreateCheckoutSessionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	out, err := h.createCheckoutSessionUC.Execute(r.Context(), orderuc.CreateCheckoutSessionInput{
		UserID:         claims.UserID,
		OrderID:        orderID,
		SuccessURLBase: h.checkoutSuccessURL,
		CancelURLBase:  h.checkoutCancelURL,
	})
	if err != nil {
		var stripeSessErr *stripeinfra.CheckoutSessionError
		if errors.As(err, &stripeSessErr) {
			writeError(w, http.StatusBadRequest, stripeSessErr.Message)
			return
		}
		switch {
		case errors.Is(err, repository.ErrNotFound):
			writeError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, orderuc.ErrOrderNotPending):
			writeError(w, http.StatusConflict, "order is not pending payment")
		case errors.Is(err, orderuc.ErrStripeCheckoutDisabled):
			writeError(w, http.StatusServiceUnavailable, "stripe checkout is not configured")
		default:
			writeError(w, http.StatusInternalServerError, "failed to create checkout session")
		}
		return
	}

	writeJSON(w, http.StatusOK, dto.CreateCheckoutSessionResponse{URL: out.URL})
}

func (h *UserHandler) CreatePaymentIntent(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid order ID")
		return
	}

	out, err := h.createPaymentIntentUC.Execute(r.Context(), orderuc.CreatePaymentIntentInput{
		UserID:  claims.UserID,
		OrderID: orderID,
	})
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			writeError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, orderuc.ErrOrderNotPending):
			writeError(w, http.StatusConflict, "order is not pending payment")
		case errors.Is(err, orderuc.ErrStripeCheckoutDisabled):
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		default:
			writeError(w, http.StatusInternalServerError, "failed to create payment intent")
		}
		return
	}

	writeJSON(w, http.StatusOK, dto.CreatePaymentIntentResponse{
		ClientSecret: out.ClientSecret,
		AmountCents:  out.AmountCents,
	})
}

func (h *UserHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid order ID")
		return
	}

	order, err := h.getOrderUC.Execute(r.Context(), orderID, claims.UserID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "order not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get order")
		return
	}

	writeJSON(w, http.StatusOK, toOrderResponse(order))
}

func (h *UserHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orders, err := h.listOrdersUC.Execute(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list orders")
		return
	}

	resp := make([]dto.OrderResponse, 0, len(orders))
	for _, o := range orders {
		resp = append(resp, toOrderResponse(o))
	}
	writeJSON(w, http.StatusOK, resp)
}

// ----- Tickets -----

func (h *UserHandler) ListTickets(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tickets, err := h.listTicketsUC.Execute(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tickets")
		return
	}

	resp := make([]dto.TicketResponse, 0, len(tickets))
	for _, t := range tickets {
		resp = append(resp, toTicketResponse(t))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *UserHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	ticketID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid ticket ID")
		return
	}

	ticket, err := h.getTicketUC.Execute(r.Context(), ticketID, claims.UserID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ticket not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get ticket")
		return
	}

	writeJSON(w, http.StatusOK, toTicketResponse(ticket))
}

// ----- Helpers -----

func toOrderResponse(o *entity.Order) dto.OrderResponse {
	resIDs := make([]string, 0, len(o.ReservationIDs))
	for _, id := range o.ReservationIDs {
		resIDs = append(resIDs, id.String())
	}
	return dto.OrderResponse{
		ID:             o.ID.String(),
		TotalCents:     o.TotalCents,
		Status:         o.Status.String(),
		CreatedAt:      o.CreatedAt.Format(time.RFC3339),
		ReservationIDs: resIDs,
	}
}

func toTicketResponse(t *repository.TicketWithDetails) dto.TicketResponse {
	resp := dto.TicketResponse{
		ID:          t.ID.String(),
		OrderID:     t.OrderID.String(),
		EventID:     t.EventID.String(),
		SeatID:      t.SeatID.String(),
		QRCode:      t.QRCode,
		Status:      t.Status.String(),
		PurchasedAt: t.PurchasedAt.Format(time.RFC3339),
		Event: &dto.TicketEventInfo{
			ID:        t.EventID.String(),
			HomeTeam:  t.EventHomeTeam,
			AwayTeam:  t.EventAwayTeam,
			League:    t.EventLeague,
			Sport:     t.EventSport,
			StartsAt:  t.EventStartsAt.Format(time.RFC3339),
			ImageURL:  t.EventImageURL,
			VenueName: t.VenueName,
			VenueCity: t.VenueCity,
		},
		Seat: &dto.TicketSeatInfo{
			ID:         t.SeatID.String(),
			Section:    t.SeatSection,
			Row:        t.SeatRow,
			Number:     t.SeatNumber,
			PriceCents: t.SeatPriceCents,
		},
	}
	return resp
}
