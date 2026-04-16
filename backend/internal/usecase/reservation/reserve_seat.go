package reservation

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

var (
	ErrSeatNotAvailable  = errors.New("one or more seats are not available")
	ErrSeatAlreadyLocked = errors.New("one or more seats are already locked")
	ErrMaxSeatsExceeded  = errors.New("cannot reserve more than 6 seats per order")
	ErrSeatWrongEvent    = errors.New("seat does not belong to the event")
	ErrOrganizationMismatch = errors.New("event does not belong to this organization")
)

const maxSeatsPerOrder = 6

type ReserveSeatInput struct {
	UserID                 uuid.UUID
	EventID                uuid.UUID
	SeatIDs                []uuid.UUID
	ExpectedOrganizationID *uuid.UUID
}

type ReserveSeatOutput struct {
	Reservations []*entity.Reservation
}

type ReserveSeatUseCase struct {
	seatRepo        repository.SeatRepository
	reservationRepo repository.ReservationRepository
	eventRepo       repository.EventRepository
	seatLocker      service.SeatLockerService
}

func NewReserveSeatUseCase(
	seatRepo repository.SeatRepository,
	reservationRepo repository.ReservationRepository,
	eventRepo repository.EventRepository,
	seatLocker service.SeatLockerService,
) *ReserveSeatUseCase {
	return &ReserveSeatUseCase{
		seatRepo:        seatRepo,
		reservationRepo: reservationRepo,
		eventRepo:       eventRepo,
		seatLocker:      seatLocker,
	}
}

func (uc *ReserveSeatUseCase) Execute(ctx context.Context, input ReserveSeatInput) (*ReserveSeatOutput, error) {
	if len(input.SeatIDs) == 0 {
		return nil, errors.New("at least one seat must be provided")
	}
	if len(input.SeatIDs) > maxSeatsPerOrder {
		return nil, ErrMaxSeatsExceeded
	}

	if input.ExpectedOrganizationID != nil {
		ev, err := uc.eventRepo.GetByID(ctx, input.EventID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return nil, repository.ErrNotFound
			}
			return nil, fmt.Errorf("reserve seat: get event: %w", err)
		}
		if ev.Venue == nil || ev.Venue.OrganizationID != *input.ExpectedOrganizationID {
			return nil, ErrOrganizationMismatch
		}
	}

	// Validate + lock each seat
	lockedSeats := make([]uuid.UUID, 0, len(input.SeatIDs))
	rollback := func() {
		for _, seatID := range lockedSeats {
			_ = uc.seatLocker.Unlock(ctx, input.EventID, seatID)
		}
	}

	for _, seatID := range input.SeatIDs {
		seat, err := uc.seatRepo.GetByID(ctx, seatID)
		if err != nil {
			rollback()
			return nil, fmt.Errorf("reserve seat: get seat %s: %w", seatID, err)
		}
		if seat.EventID != input.EventID {
			rollback()
			return nil, ErrSeatWrongEvent
		}
		if seat.Status != entity.SeatStatusAvailable {
			rollback()
			return nil, ErrSeatNotAvailable
		}
		if err := uc.seatLocker.Lock(ctx, input.EventID, seatID, input.UserID); err != nil {
			rollback()
			if errors.Is(err, service.ErrSeatAlreadyLocked) {
				return nil, ErrSeatAlreadyLocked
			}
			return nil, fmt.Errorf("reserve seat: lock seat %s: %w", seatID, err)
		}
		lockedSeats = append(lockedSeats, seatID)
	}

	// Create DB reservations
	reservations := make([]*entity.Reservation, 0, len(input.SeatIDs))
	for _, seatID := range input.SeatIDs {
		res, err := entity.NewReservation(seatID, input.UserID)
		if err != nil {
			rollback()
			return nil, fmt.Errorf("reserve seat: new reservation: %w", err)
		}
		if err := uc.reservationRepo.Create(ctx, res); err != nil {
			rollback()
			return nil, fmt.Errorf("reserve seat: create reservation: %w", err)
		}
		// Mark seat as RESERVED in DB so the seat map shows it as unavailable
		if err := uc.seatRepo.UpdateStatus(ctx, seatID, entity.SeatStatusReserved); err != nil {
			rollback()
			return nil, fmt.Errorf("reserve seat: update seat status: %w", err)
		}
		reservations = append(reservations, res)
	}

	return &ReserveSeatOutput{Reservations: reservations}, nil
}

// ReleaseSeatInput holds data for manually releasing a reservation.
type ReleaseSeatInput struct {
	UserID        uuid.UUID
	ReservationID uuid.UUID
	EventID       uuid.UUID
}

// ReleaseSeatUseCase cancels an active reservation and unlocks the seat.
type ReleaseSeatUseCase struct {
	reservationRepo repository.ReservationRepository
	seatRepo        repository.SeatRepository
	seatLocker      service.SeatLockerService
}

func NewReleaseSeatUseCase(
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	seatLocker service.SeatLockerService,
) *ReleaseSeatUseCase {
	return &ReleaseSeatUseCase{
		reservationRepo: reservationRepo,
		seatRepo:        seatRepo,
		seatLocker:      seatLocker,
	}
}

func (uc *ReleaseSeatUseCase) Execute(ctx context.Context, input ReleaseSeatInput) error {
	res, err := uc.reservationRepo.GetByID(ctx, input.ReservationID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return repository.ErrNotFound
		}
		return fmt.Errorf("release seat: get reservation: %w", err)
	}
	if res.UserID != input.UserID {
		return errors.New("reservation does not belong to this user")
	}
	if res.Status != entity.ReservationStatusActive {
		return errors.New("reservation is not active")
	}
	if err := res.Expire(); err != nil {
		return fmt.Errorf("release seat: expire reservation: %w", err)
	}
	if err := uc.reservationRepo.UpdateStatus(ctx, res.ID, res.Status); err != nil {
		return fmt.Errorf("release seat: update status: %w", err)
	}
	// Release the seat back to AVAILABLE in the DB
	if err := uc.seatRepo.UpdateStatus(ctx, res.SeatID, entity.SeatStatusAvailable); err != nil {
		return fmt.Errorf("release seat: update seat status: %w", err)
	}
	_ = uc.seatLocker.Unlock(ctx, input.EventID, res.SeatID)
	return nil
}
