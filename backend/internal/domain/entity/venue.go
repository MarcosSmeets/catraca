package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Venue struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	Name           string
	City           string
	State          string
	Capacity       int
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}

func NewVenue(organizationID uuid.UUID, name, city, state string, capacity int) (*Venue, error) {
	v := &Venue{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           name,
		City:           city,
		State:          state,
		Capacity:       capacity,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if err := v.Validate(); err != nil {
		return nil, err
	}
	return v, nil
}

func (v *Venue) Validate() error {
	if v.OrganizationID == uuid.Nil {
		return errors.New("venue organization ID is required")
	}
	if v.Name == "" {
		return errors.New("venue name is required")
	}
	if v.City == "" {
		return errors.New("venue city is required")
	}
	if v.State == "" {
		return errors.New("venue state is required")
	}
	if len(v.State) != 2 {
		return errors.New("venue state must be 2 characters (UF)")
	}
	if v.Capacity <= 0 {
		return errors.New("venue capacity must be positive")
	}
	return nil
}
