package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/marcos-smeets/catraca/backend/internal/config"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	"github.com/marcos-smeets/catraca/backend/internal/infra/seed"
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

	pool, err := pginfra.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	eventRepo := pginfra.NewEventRepository(pool)
	venueRepo := pginfra.NewVenueRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	log.Info().Msg("loading demo data...")
	if err := seed.LoadDemoData(ctx, eventRepo, venueRepo, seatRepo); err != nil {
		log.Fatal().Err(err).Msg("seed failed")
	}
	log.Info().Msg("demo data loaded successfully")
}
