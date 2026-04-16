package worker

import (
	"context"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/http/sse"
)

// SeatExpiryWorker subscribes to Redis keyspace notifications for expired seat locks
// and releases the corresponding DB reservation + seat status.
type SeatExpiryWorker struct {
	redisClient       *goredis.Client
	reservationRepo   repository.ReservationRepository
	seatRepo          repository.SeatRepository
	orderRepo         repository.OrderRepository
	resaleHoldRepo    repository.ResaleListingHoldRepository
	sseHub            *sse.Hub
}

func NewSeatExpiryWorker(
	redisClient *goredis.Client,
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	orderRepo repository.OrderRepository,
	resaleHoldRepo repository.ResaleListingHoldRepository,
	sseHub *sse.Hub,
) *SeatExpiryWorker {
	return &SeatExpiryWorker{
		redisClient:     redisClient,
		reservationRepo: reservationRepo,
		seatRepo:        seatRepo,
		orderRepo:       orderRepo,
		resaleHoldRepo:  resaleHoldRepo,
		sseHub:          sseHub,
	}
}

// Run subscribes to Redis keyspace notifications and processes expired seat lock keys.
// It blocks until ctx is cancelled.
func (w *SeatExpiryWorker) Run(ctx context.Context) error {
	pubsub := w.redisClient.PSubscribe(ctx, "__keyevent@0__:expired")
	defer pubsub.Close()

	log.Info().Msg("seat expiry worker started")
	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("seat expiry worker stopped")
			return nil
		case msg, ok := <-ch:
			if !ok {
				return nil
			}
			// Key format: seat_lock:{eventID}:{seatID}
			key := msg.Payload
			if !strings.HasPrefix(key, "seat_lock:") {
				continue
			}
			parts := strings.Split(key, ":")
			if len(parts) != 3 {
				log.Warn().Str("key", key).Msg("unexpected seat lock key format")
				continue
			}
			eventID, err := uuid.Parse(parts[1])
			if err != nil {
				log.Warn().Str("key", key).Err(err).Msg("invalid event ID in seat lock key")
				continue
			}
			seatID, err := uuid.Parse(parts[2])
			if err != nil {
				log.Warn().Str("key", key).Err(err).Msg("invalid seat ID in seat lock key")
				continue
			}
			w.handleExpiry(ctx, eventID, seatID)
		}
	}
}

// RunSweeper periodically releases seats whose reservation is still ACTIVE but past expires_at
// (e.g. Redis keyspace notifications disabled or expiry event missed).
func (w *SeatExpiryWorker) RunSweeper(ctx context.Context, interval time.Duration) error {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	log.Info().Dur("interval", interval).Msg("reservation expiry sweeper started")
	w.sweepExpiredActive(ctx)
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("reservation expiry sweeper stopped")
			return nil
		case <-ticker.C:
			w.sweepExpiredActive(ctx)
		}
	}
}

func (w *SeatExpiryWorker) sweepExpiredActive(ctx context.Context) {
	rows, err := w.reservationRepo.ListExpiredActive(ctx)
	if err != nil {
		log.Error().Err(err).Msg("list expired active reservations")
		return
	}
	for _, row := range rows {
		w.handleExpiry(ctx, row.EventID, row.SeatID)
	}
	if w.resaleHoldRepo != nil {
		if err := w.resaleHoldRepo.ExpireStale(ctx); err != nil {
			log.Error().Err(err).Msg("expire stale resale listing holds")
		}
	}
}

func (w *SeatExpiryWorker) handleExpiry(ctx context.Context, eventID, seatID uuid.UUID) {
	// Find the active reservation for this seat
	res, err := w.reservationRepo.GetActiveStatusBySeatID(ctx, seatID)
	if err != nil {
		if err != repository.ErrNotFound {
			log.Error().Err(err).Stringer("seat_id", seatID).Msg("get active reservation for expired seat")
		}
		return
	}

	// Do not expire reservations that belong to a PENDING order (payment in progress).
	hasPending, err := w.orderRepo.HasPendingOrderForReservation(ctx, res.ID)
	if err != nil {
		log.Error().Err(err).Stringer("reservation_id", res.ID).Msg("check pending order for reservation")
		return
	}
	if hasPending {
		log.Debug().Stringer("reservation_id", res.ID).Stringer("seat_id", seatID).Msg("reservation has pending order, skipping expiry")
		return
	}

	if err := res.Expire(); err != nil {
		log.Warn().Err(err).Stringer("reservation_id", res.ID).Msg("expire reservation")
		return
	}
	if err := w.reservationRepo.UpdateStatus(ctx, res.ID, entity.ReservationStatusExpired); err != nil {
		log.Error().Err(err).Stringer("reservation_id", res.ID).Msg("update reservation status")
		return
	}

	// Release the seat back to AVAILABLE
	if err := w.seatRepo.UpdateStatus(ctx, seatID, entity.SeatStatusAvailable); err != nil {
		log.Error().Err(err).Stringer("seat_id", seatID).Msg("update seat status to available")
		return
	}

	// Broadcast SSE update so frontend seat maps refresh
	w.sseHub.Broadcast(eventID, sse.SeatUpdateEvent{
		Type:    "seat_update",
		SeatID:  seatID.String(),
		Status:  entity.SeatStatusAvailable.String(),
		EventID: eventID.String(),
	})

	log.Info().
		Stringer("seat_id", seatID).
		Stringer("reservation_id", res.ID).
		Msg("seat lock expired: seat released")
}
