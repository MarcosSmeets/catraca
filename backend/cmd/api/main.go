package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	stripelib "github.com/stripe/stripe-go/v76"
	"golang.org/x/sync/errgroup"

	"github.com/marcos-smeets/catraca/backend/internal/config"
	httphandler "github.com/marcos-smeets/catraca/backend/internal/handler/http"
	"github.com/marcos-smeets/catraca/backend/internal/handler/http/sse"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	jwtinfra "github.com/marcos-smeets/catraca/backend/internal/infra/jwt"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	redisinfra "github.com/marcos-smeets/catraca/backend/internal/infra/redis"
	"github.com/marcos-smeets/catraca/backend/internal/infra/seed"
	stripeinfra "github.com/marcos-smeets/catraca/backend/internal/infra/stripe"
	userevents "github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	orderuc "github.com/marcos-smeets/catraca/backend/internal/usecase/order"
	reservationuc "github.com/marcos-smeets/catraca/backend/internal/usecase/reservation"
	ticketuc "github.com/marcos-smeets/catraca/backend/internal/usecase/ticket"
	useruc "github.com/marcos-smeets/catraca/backend/internal/usecase/user"
	"github.com/marcos-smeets/catraca/backend/internal/worker"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	if cfg.AppEnv == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// --- Database ---
	pool, err := pginfra.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	// --- Redis ---
	redisClient, err := redisinfra.NewClient(cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to redis")
	}
	defer redisClient.Close()

	// --- Repositories ---
	userRepo := pginfra.NewUserRepository(pool, cfg.PhoneEncryptionKey)
	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)
	venueRepo := pginfra.NewVenueRepository(pool)
	sectionRepo := pginfra.NewSectionRepository(pool)
	reservationRepo := pginfra.NewReservationRepository(pool)
	orderRepo := pginfra.NewOrderRepository(pool)
	ticketRepo := pginfra.NewTicketRepository(pool)
	stripeWebhookInboxRepo := pginfra.NewStripeWebhookInboxRepository(pool)
	adminMetricsRepo := pginfra.NewAdminMetricsRepository(pool)

	// --- Seed demo data (idempotent) ---
	if cfg.AppSeed {
		log.Info().Msg("seeding demo data...")
		if err := seed.LoadDemoData(ctx, eventRepo, venueRepo, seatRepo); err != nil {
			log.Warn().Err(err).Msg("seed completed with warnings (data may already exist)")
		} else {
			log.Info().Msg("seed complete")
		}
	}

	// --- Infrastructure services ---
	tokenService := jwtinfra.NewTokenService(cfg.JWTSecret, cfg.JWTRefreshSecret)
	seatLocker := redisinfra.NewSeatLocker(redisClient)
	tokenStore := redisinfra.NewTokenStore(redisClient)
	paymentGateway := stripeinfra.NewPaymentGateway(cfg.StripeSecretKey, cfg.StripeWebhookSecret)

	// --- SSE Hub ---
	sseHub := sse.NewHub()

	// --- Use Cases ---
	registerUC := useruc.NewRegisterUseCase(userRepo, tokenService, cfg.CPFPepper)
	loginUC := useruc.NewLoginUseCase(userRepo, tokenService)
	refreshUC := useruc.NewRefreshUseCase(userRepo, tokenService)
	forgotPasswordUC := useruc.NewForgotPasswordUseCase(userRepo, tokenStore)
	resetPasswordUC := useruc.NewResetPasswordUseCase(userRepo, tokenStore)

	listEventsUC := userevents.NewListEventsUseCase(eventRepo)
	getEventUC := userevents.NewGetEventUseCase(eventRepo)
	listSeatsUC := userevents.NewListSeatsUseCase(seatRepo)

	reserveSeatUC := reservationuc.NewReserveSeatUseCase(seatRepo, reservationRepo, seatLocker)
	releaseSeatUC := reservationuc.NewReleaseSeatUseCase(reservationRepo, seatRepo, seatLocker)

	createOrderUC := orderuc.NewCreateOrderUseCase(reservationRepo, seatRepo, eventRepo, orderRepo)
	createCheckoutSessionUC := orderuc.NewCreateCheckoutSessionUseCase(orderRepo, paymentGateway, cfg.StripeCheckoutEnablePix)
	createPaymentIntentUC := orderuc.NewCreatePaymentIntentUseCase(orderRepo, paymentGateway)
	getOrderUC := orderuc.NewGetOrderUseCase(orderRepo)
	listOrdersUC := orderuc.NewListOrdersUseCase(orderRepo)

	listTicketsUC := ticketuc.NewListTicketsUseCase(ticketRepo)
	getTicketUC := ticketuc.NewGetTicketUseCase(ticketRepo, orderRepo)
	scanTicketUC := ticketuc.NewScanTicketUseCase(ticketRepo)

	// --- Workers ---
	stripePaymentProcessor := worker.NewStripePaymentProcessor(orderRepo, reservationRepo, seatRepo, ticketRepo, seatLocker, sseHub, paymentGateway)
	stripeInboxWorker := worker.NewStripeInboxWorker(pool, stripeWebhookInboxRepo, paymentGateway, stripePaymentProcessor)
	expiryWorker := worker.NewSeatExpiryWorker(redisClient, reservationRepo, seatRepo, orderRepo, sseHub)

	// --- Handlers ---
	authHandler := httphandler.NewAuthHandler(registerUC, loginUC, refreshUC, forgotPasswordUC, resetPasswordUC, cfg.AppEnv)
	eventHandler := httphandler.NewEventHandler(listEventsUC, getEventUC, listSeatsUC)
	sseHandler := httphandler.NewSSEHandler(sseHub)
	webhookHandler := httphandler.NewWebhookHandler(stripeWebhookInboxRepo)
	adminHandler := httphandler.NewAdminHandler(venueRepo, eventRepo, seatRepo, sectionRepo)
	adminMetricsHandler := httphandler.NewAdminMetricsHandler(adminMetricsRepo)
	adminTicketHandler := httphandler.NewAdminTicketHandler(scanTicketUC)
	userHandler := httphandler.NewUserHandler(httphandler.UserDeps{
		UserRepo:                userRepo,
		SSEHub:                  sseHub,
		ReserveSeatUC:           reserveSeatUC,
		ReleaseSeatUC:           releaseSeatUC,
		CreateOrderUC:           createOrderUC,
		CreateCheckoutSessionUC: createCheckoutSessionUC,
		CreatePaymentIntentUC:  createPaymentIntentUC,
		GetOrderUC:              getOrderUC,
		ListOrdersUC:            listOrdersUC,
		ListTicketsUC:           listTicketsUC,
		GetTicketUC:             getTicketUC,
		StripeEnabled:           paymentGateway.IsConfigured(),
		CheckoutSuccessURL:      cfg.StripeCheckoutSuccessURL,
		CheckoutCancelURL:       cfg.StripeCheckoutCancelURL,
	})

	// --- Router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth (public)
	r.Post("/auth/register", authHandler.Register)
	r.Post("/auth/login", authHandler.Login)
	r.Post("/auth/refresh", authHandler.Refresh)
	r.Delete("/auth/logout", authHandler.Logout)
	r.Post("/auth/forgot-password", authHandler.ForgotPassword)
	r.Post("/auth/reset-password", authHandler.ResetPassword)

	// Admin auth (public — role is verified inside the handler)
	r.Post("/admin/auth/login", authHandler.AdminLogin)
	r.Post("/admin/auth/logout", authHandler.AdminLogout)

	// Events (public)
	r.Get("/events", eventHandler.List)
	r.Get("/events/{id}", eventHandler.Get)
	r.Get("/events/{id}/seats", eventHandler.ListSeats)
	r.Get("/events/{id}/seats/stream", sseHandler.SeatStream)

	// Stripe webhook (public — Stripe sends its own signature)
	r.Post("/webhooks/stripe", webhookHandler.HandleStripe)

	// Dev-only: simulate payment success without Stripe (only active when STRIPE_SECRET_KEY is empty)
	if cfg.StripeSecretKey == "" {
		r.Post("/dev/orders/{id}/pay", func(w http.ResponseWriter, r *http.Request) {
			idStr := chi.URLParam(r, "id")
			orderID, err := uuid.Parse(idStr)
			if err != nil {
				http.Error(w, `{"error":"invalid order id"}`, http.StatusBadRequest)
				return
			}
			order, err := orderRepo.GetByID(r.Context(), orderID)
			if err != nil {
				http.Error(w, `{"error":"order not found"}`, http.StatusNotFound)
				return
			}
			payload := []byte(`{"id":"` + order.StripePaymentID + `","metadata":{"order_id":"` + order.ID.String() + `","user_id":"` + order.UserID.String() + `"}}`)
			if err := stripePaymentProcessor.ProcessStripeEvent(r.Context(), string(stripelib.EventTypePaymentIntentSucceeded), payload); err != nil {
				http.Error(w, `{"error":"simulated payment failed"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"message":"payment simulated","orderId":"` + orderID.String() + `"}`))
		})
	}

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authmw.Auth(tokenService))

		// Profile
		r.Get("/me/profile", userHandler.GetProfile)
		r.Patch("/me/profile", userHandler.UpdateProfile)

		// Reservations
		r.Post("/reservations", userHandler.CreateReservation)
		r.Delete("/reservations/{id}", userHandler.DeleteReservation)

		// Orders
		r.Post("/orders", userHandler.CreateOrder)
		r.Post("/orders/{id}/checkout-session", userHandler.CreateCheckoutSession)
		r.Post("/orders/{id}/payment-intent", userHandler.CreatePaymentIntent)
		r.Get("/me/orders", userHandler.ListOrders)
		r.Get("/me/orders/{id}", userHandler.GetOrder)

		// Tickets
		r.Get("/me/tickets", userHandler.ListTickets)
		r.Get("/me/tickets/{id}", userHandler.GetTicket)
	})

	// Admin routes
	r.Group(func(r chi.Router) {
		r.Use(authmw.Auth(tokenService))
		r.Use(authmw.RequireRole("admin", "organizer"))

		r.Get("/admin/metrics", adminMetricsHandler.GetDashboard)

		r.Get("/admin/venues", adminHandler.ListVenues)
		r.Get("/admin/venues/states", adminHandler.ListVenueStates)
		r.Post("/admin/venues", adminHandler.CreateVenue)

		r.Get("/admin/events", adminHandler.ListEvents)
		r.Post("/admin/events", adminHandler.CreateEvent)
		r.Patch("/admin/events/{id}", adminHandler.UpdateEvent)
		r.Post("/admin/events/{id}/publish", adminHandler.PublishEvent)

		r.Get("/admin/events/{id}/sections", adminHandler.ListSections)
		r.Post("/admin/events/{id}/sections", adminHandler.CreateSection)

		r.Post("/admin/events/{id}/seats/batch", adminHandler.BatchCreateSeats)
	})

	// Ticket scan — accessible to admin, organizer and staff
	r.Group(func(r chi.Router) {
		r.Use(authmw.Auth(tokenService))
		r.Use(authmw.RequireRole("admin", "organizer", "staff"))

		r.Post("/admin/tickets/scan", adminTicketHandler.ScanTicket)
	})

	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start workers + HTTP server with errgroup
	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return stripeInboxWorker.Run(gCtx)
	})

	g.Go(func() error {
		return expiryWorker.Run(gCtx)
	})

	g.Go(func() error {
		return expiryWorker.RunSweeper(gCtx, time.Minute)
	})

	g.Go(func() error {
		log.Info().Str("addr", cfg.Addr()).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			return err
		}
		return nil
	})

	g.Go(func() error {
		<-gCtx.Done()
		log.Info().Msg("shutting down gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	})

	if err := g.Wait(); err != nil && err != http.ErrServerClosed {
		log.Error().Err(err).Msg("server exited with error")
	}
	log.Info().Msg("server stopped")
}
