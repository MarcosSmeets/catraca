package entity

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	SubscriptionInactive   = "inactive"
	SubscriptionTrialing = "trialing"
	SubscriptionActive   = "active"
	SubscriptionPastDue  = "past_due"
	SubscriptionCanceled = "canceled"
	SubscriptionUnpaid   = "unpaid"
)

type Organization struct {
	ID                   uuid.UUID
	Name                 string
	Slug                 string
	StripeCustomerID     string
	StripeSubscriptionID string
	SubscriptionStatus   string
	CurrentPeriodEnd     *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
	DeletedAt            *time.Time
}

func NewOrganization(name, slug string) (*Organization, error) {
	slug = normalizeOrgSlug(slug)
	o := &Organization{
		ID:                 uuid.New(),
		Name:               strings.TrimSpace(name),
		Slug:               slug,
		SubscriptionStatus: SubscriptionInactive,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	return o, nil
}

func (o *Organization) Validate() error {
	if o.Name == "" {
		return errors.New("organization name is required")
	}
	if o.Slug == "" {
		return errors.New("organization slug is required")
	}
	if len(o.Slug) < 2 || len(o.Slug) > 100 {
		return errors.New("organization slug must be between 2 and 100 characters")
	}
	for _, r := range o.Slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			continue
		}
		return errors.New("organization slug must be lowercase letters, digits, and hyphens only")
	}
	return nil
}

func normalizeOrgSlug(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// NormalizeOrganizationSlug lowercases and trims an organization slug input (for APIs / PATCH).
func NormalizeOrganizationSlug(s string) string {
	return normalizeOrgSlug(s)
}

// SubscriptionAllowsMutations returns whether organizers may create venues, events, publish, etc.
func SubscriptionAllowsMutations(status string) bool {
	switch status {
	case SubscriptionActive, SubscriptionTrialing:
		return true
	default:
		return false
	}
}
