package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

const ReservationTTL = 10 * time.Minute

type Reservation struct {
	ID        uuid.UUID
	SeatID    uuid.UUID
	UserID    uuid.UUID
	ExpiresAt time.Time
	Status    ReservationStatus
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewReservation(seatID, userID uuid.UUID) (*Reservation, error) {
	now := time.Now()
	r := &Reservation{
		ID:        uuid.New(),
		SeatID:    seatID,
		UserID:    userID,
		ExpiresAt: now.Add(ReservationTTL),
		Status:    ReservationStatusActive,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := r.Validate(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Reservation) Validate() error {
	if r.SeatID == uuid.Nil {
		return errors.New("reservation seat ID is required")
	}
	if r.UserID == uuid.Nil {
		return errors.New("reservation user ID is required")
	}
	if r.ExpiresAt.IsZero() {
		return errors.New("reservation expiration is required")
	}
	return nil
}

func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

func (r *Reservation) Expire() error {
	if r.Status != ReservationStatusActive {
		return errors.New("only active reservations can expire")
	}
	r.Status = ReservationStatusExpired
	r.UpdatedAt = time.Now()
	return nil
}

func (r *Reservation) Convert() error {
	if r.Status != ReservationStatusActive {
		return errors.New("only active reservations can be converted")
	}
	if r.IsExpired() {
		return errors.New("cannot convert an expired reservation")
	}
	r.Status = ReservationStatusConverted
	r.UpdatedAt = time.Now()
	return nil
}
