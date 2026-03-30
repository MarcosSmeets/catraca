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
	"github.com/marcos-smeets/catraca/backend/internal/config"
	httphandler "github.com/marcos-smeets/catraca/backend/internal/handler/http"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	jwtinfra "github.com/marcos-smeets/catraca/backend/internal/infra/jwt"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	eventuc "github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/user"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
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

	// --- Repositories ---
	userRepo := mock.NewUserRepository() // TODO: replace with postgres UserRepository
	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	// --- Infrastructure ---
	tokenService := jwtinfra.NewTokenService(cfg.JWTSecret, cfg.JWTRefreshSecret)

	// --- Use Cases ---
	registerUC := user.NewRegisterUseCase(userRepo, tokenService)
	loginUC := user.NewLoginUseCase(userRepo, tokenService)
	refreshUC := user.NewRefreshUseCase(userRepo, tokenService)

	listEventsUC := eventuc.NewListEventsUseCase(eventRepo)
	getEventUC := eventuc.NewGetEventUseCase(eventRepo)
	listSeatsUC := eventuc.NewListSeatsUseCase(seatRepo)

	// --- Handlers ---
	authHandler := httphandler.NewAuthHandler(registerUC, loginUC, refreshUC)
	eventHandler := httphandler.NewEventHandler(listEventsUC, getEventUC, listSeatsUC)

	// --- Router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth routes (public)
	r.Post("/auth/register", authHandler.Register)
	r.Post("/auth/login", authHandler.Login)
	r.Post("/auth/refresh", authHandler.Refresh)
	r.Delete("/auth/logout", authHandler.Logout)

	// Event routes (public)
	r.Get("/events", eventHandler.List)
	r.Get("/events/{id}", eventHandler.Get)
	r.Get("/events/{id}/seats", eventHandler.ListSeats)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authmw.Auth(tokenService))
		// Phase 4+: /reservations, /orders, /me/tickets
	})

	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Str("addr", cfg.Addr()).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	<-ctx.Done()
	log.Info().Msg("shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("shutdown failed")
	}

	log.Info().Msg("server stopped")
}
