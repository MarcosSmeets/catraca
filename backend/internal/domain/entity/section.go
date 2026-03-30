package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Section struct {
	ID        uuid.UUID
	EventID   uuid.UUID
	Name      string
	ImageURL  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewSection(eventID uuid.UUID, name, imageURL string) (*Section, error) {
	s := &Section{
		ID:        uuid.New(),
		EventID:   eventID,
		Name:      name,
		ImageURL:  imageURL,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.Validate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Section) Validate() error {
	if s.EventID == uuid.Nil {
		return errors.New("section event ID is required")
	}
	if s.Name == "" {
		return errors.New("section name is required")
	}
	return nil
}
