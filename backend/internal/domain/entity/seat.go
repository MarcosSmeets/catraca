package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Seat struct {
	ID         uuid.UUID
	EventID    uuid.UUID
	Section    string
	Row        string
	Number     string
	PriceCents int64
	Status     SeatStatus
	Col        int
	RowIndex   int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func NewSeat(eventID uuid.UUID, section, row, number string, priceCents int64, col, rowIndex int) (*Seat, error) {
	s := &Seat{
		ID:         uuid.New(),
		EventID:    eventID,
		Section:    section,
		Row:        row,
		Number:     number,
		PriceCents: priceCents,
		Status:     SeatStatusAvailable,
		Col:        col,
		RowIndex:   rowIndex,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if err := s.Validate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Seat) Validate() error {
	if s.EventID == uuid.Nil {
		return errors.New("seat event ID is required")
	}
	if s.Section == "" {
		return errors.New("seat section is required")
	}
	if s.Row == "" {
		return errors.New("seat row is required")
	}
	if s.Number == "" {
		return errors.New("seat number is required")
	}
	if s.PriceCents <= 0 {
		return errors.New("seat price must be positive")
	}
	return nil
}

func (s *Seat) Reserve() error {
	if s.Status != SeatStatusAvailable {
		return ErrSeatNotAvailable
	}
	s.Status = SeatStatusReserved
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Seat) Sell() error {
	if s.Status != SeatStatusReserved {
		return ErrSeatNotReserved
	}
	s.Status = SeatStatusSold
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Seat) Release() error {
	if s.Status != SeatStatusReserved {
		return ErrSeatNotReserved
	}
	s.Status = SeatStatusAvailable
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Seat) Block() error {
	if s.Status == SeatStatusSold {
		return errors.New("cannot block a sold seat")
	}
	s.Status = SeatStatusBlocked
	s.UpdatedAt = time.Now()
	return nil
}
