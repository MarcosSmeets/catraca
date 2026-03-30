package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID                uuid.UUID
	Title             string
	Sport             SportType
	League            string
	VenueID           uuid.UUID
	Venue             *Venue
	StartsAt          time.Time
	Status            EventStatus
	ServiceFeePercent float64
	HomeTeam          string
	AwayTeam          string
	ImageURL          string
	VibeChips         []string
	MinPriceCents     int64
	MaxPriceCents     int64
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         *time.Time
}

func NewEvent(title string, sport SportType, league string, venueID uuid.UUID, startsAt time.Time, serviceFeePercent float64, homeTeam, awayTeam, imageURL string) (*Event, error) {
	e := &Event{
		ID:                uuid.New(),
		Title:             title,
		Sport:             sport,
		League:            league,
		VenueID:           venueID,
		StartsAt:          startsAt,
		Status:            EventStatusDraft,
		ServiceFeePercent: serviceFeePercent,
		HomeTeam:          homeTeam,
		AwayTeam:          awayTeam,
		ImageURL:          imageURL,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := e.Validate(); err != nil {
		return nil, err
	}
	return e, nil
}

func (e *Event) Validate() error {
	if e.Title == "" {
		return errors.New("event title is required")
	}
	if !e.Sport.IsValid() {
		return errors.New("invalid sport type")
	}
	if e.League == "" {
		return errors.New("event league is required")
	}
	if e.VenueID == uuid.Nil {
		return errors.New("event venue ID is required")
	}
	if e.StartsAt.IsZero() {
		return errors.New("event start time is required")
	}
	if e.ServiceFeePercent < 0 || e.ServiceFeePercent > 100 {
		return errors.New("service fee percent must be between 0 and 100")
	}
	if e.HomeTeam == "" {
		return errors.New("home team is required")
	}
	if e.AwayTeam == "" {
		return errors.New("away team is required")
	}
	return nil
}

func (e *Event) Publish() error {
	if e.Status != EventStatusDraft {
		return errors.New("only draft events can be published")
	}
	e.Status = EventStatusOnSale
	e.UpdatedAt = time.Now()
	return nil
}

func (e *Event) MarkSoldOut() error {
	if e.Status != EventStatusOnSale {
		return errors.New("only on-sale events can be marked as sold out")
	}
	e.Status = EventStatusSoldOut
	e.UpdatedAt = time.Now()
	return nil
}

func (e *Event) Cancel() error {
	if e.Status == EventStatusCancelled {
		return errors.New("event is already cancelled")
	}
	e.Status = EventStatusCancelled
	e.UpdatedAt = time.Now()
	return nil
}
