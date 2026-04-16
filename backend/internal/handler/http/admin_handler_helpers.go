package http

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
)

var (
	errEventNotInScope        = errors.New("event not in scope")
	errVenueNotInScope       = errors.New("venue not in scope")
	errSubscriptionInactive  = errors.New("subscription does not allow this action")
)

func (h *AdminHandler) assertEventInAdminScope(r *http.Request, e *entity.Event) error {
	scoped, allOrgs, err := parseAdminOrganizationScope(r)
	if err != nil {
		return err
	}
	if allOrgs {
		return nil
	}
	if scoped == nil || e.Venue == nil || e.Venue.OrganizationID != *scoped {
		return errEventNotInScope
	}
	return nil
}

func (h *AdminHandler) assertVenueOrgInAdminScope(r *http.Request, venueOrgID uuid.UUID) error {
	scoped, allOrgs, err := parseAdminOrganizationScope(r)
	if err != nil {
		return err
	}
	if allOrgs {
		return nil
	}
	if scoped == nil || venueOrgID != *scoped {
		return errVenueNotInScope
	}
	return nil
}

func (h *AdminHandler) ensureOrgSubscriptionForMutation(r *http.Request, orgID uuid.UUID) error {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		return errors.New("unauthorized")
	}
	if isPlatformAdmin(claims) {
		return nil
	}
	o, err := h.orgRepo.GetByID(r.Context(), orgID)
	if err != nil {
		return err
	}
	if !entity.SubscriptionAllowsMutations(o.SubscriptionStatus) {
		return errSubscriptionInactive
	}
	return nil
}

func writeAdminScopeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errEventNotInScope), errors.Is(err, errVenueNotInScope):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, errSubscriptionInactive):
		writeError(w, http.StatusPaymentRequired, "active subscription required")
	case errors.Is(err, errMissingOrganizationIDQuery):
		writeError(w, http.StatusBadRequest, "organizationId is required")
	case errors.Is(err, errMissingTenantOnUser):
		writeError(w, http.StatusForbidden, "account is not linked to an organization")
	default:
		writeError(w, http.StatusForbidden, err.Error())
	}
}
