package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
)

var (
	errMissingOrganizationIDQuery = errors.New("organizationId is required for this operation")
	errMissingTenantOnUser        = errors.New("account is not linked to an organization")
)

// parseAdminOrganizationScope resolves which organization rows an admin API call may see or mutate.
// platform_admin: optional organization_id query — empty means all tenants.
// admin / organizer: scoped to JWT organization_id (required).
// staff: scoped to JWT organization_id (required).
func parseAdminOrganizationScope(r *http.Request) (orgID *uuid.UUID, allOrganizations bool, err error) {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		return nil, false, errors.New("unauthorized")
	}
	switch claims.Role {
	case "platform_admin":
		q := strings.TrimSpace(r.URL.Query().Get("organization_id"))
		if q == "" {
			return nil, true, nil
		}
		id, e := uuid.Parse(q)
		if e != nil {
			return nil, false, errMissingOrganizationIDQuery
		}
		return &id, false, nil
	case "admin", "organizer":
		if claims.OrganizationID == nil {
			return nil, false, errMissingTenantOnUser
		}
		return claims.OrganizationID, false, nil
	case "staff":
		if claims.OrganizationID == nil {
			return nil, false, errMissingTenantOnUser
		}
		return claims.OrganizationID, false, nil
	default:
		return nil, false, errors.New("forbidden")
	}
}

func isPlatformAdmin(claims *service.TokenClaims) bool {
	return claims != nil && claims.Role == "platform_admin"
}
