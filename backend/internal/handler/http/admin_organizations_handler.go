package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	stripeinfra "github.com/marcos-smeets/catraca/backend/internal/infra/stripe"
	orguc "github.com/marcos-smeets/catraca/backend/internal/usecase/organization"
)

type AdminOrganizationsHandler struct {
	orgRepo                 repository.OrganizationRepository
	userRepo                repository.UserRepository
	subscriptionCheckoutUC  *orguc.CreateSubscriptionCheckoutUseCase
}

func NewAdminOrganizationsHandler(
	orgRepo repository.OrganizationRepository,
	userRepo repository.UserRepository,
	subscriptionCheckoutUC *orguc.CreateSubscriptionCheckoutUseCase,
) *AdminOrganizationsHandler {
	return &AdminOrganizationsHandler{
		orgRepo:                orgRepo,
		userRepo:               userRepo,
		subscriptionCheckoutUC: subscriptionCheckoutUC,
	}
}

type adminOrgItemDTO struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	Slug                 string  `json:"slug"`
	SubscriptionStatus   string  `json:"subscriptionStatus"`
	StripeCustomerID       string  `json:"stripeCustomerId,omitempty"`
	StripeSubscriptionID string  `json:"stripeSubscriptionId,omitempty"`
	CurrentPeriodEnd     *string `json:"currentPeriodEnd,omitempty"`
}

type adminOrgListResponse struct {
	Items []adminOrgItemDTO `json:"items"`
	Total int64             `json:"total"`
}

func (h *AdminOrganizationsHandler) requirePlatformAdmin(w http.ResponseWriter, r *http.Request) bool {
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil || claims.Role != string(entity.UserRolePlatformAdmin) {
		writeError(w, http.StatusForbidden, "insufficient permissions")
		return false
	}
	return true
}

func (h *AdminOrganizationsHandler) List(w http.ResponseWriter, r *http.Request) {
	if !h.requirePlatformAdmin(w, r) {
		return
	}

	limit, page := parsePagination(r, 50, 200)
	offset := (page - 1) * limit

	items, err := h.orgRepo.List(r.Context(), limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list organizations")
		return
	}
	total, err := h.orgRepo.Count(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count organizations")
		return
	}

	out := adminOrgListResponse{
		Items: make([]adminOrgItemDTO, 0, len(items)),
		Total: total,
	}
	for _, o := range items {
		item := adminOrgItemDTO{
			ID:                   o.ID.String(),
			Name:                 o.Name,
			Slug:                 o.Slug,
			SubscriptionStatus:   o.SubscriptionStatus,
			StripeCustomerID:     o.StripeCustomerID,
			StripeSubscriptionID: o.StripeSubscriptionID,
		}
		if o.CurrentPeriodEnd != nil {
			s := o.CurrentPeriodEnd.UTC().Format("2006-01-02T15:04:05Z")
			item.CurrentPeriodEnd = &s
		}
		out.Items = append(out.Items, item)
	}

	writeJSON(w, http.StatusOK, out)
}

type createOrganizationRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *AdminOrganizationsHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.requirePlatformAdmin(w, r) {
		return
	}
	var body createOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	o, err := entity.NewOrganization(body.Name, body.Slug)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.orgRepo.Create(r.Context(), o); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create organization")
		return
	}
	writeJSON(w, http.StatusCreated, adminOrgItemDTO{
		ID:                 o.ID.String(),
		Name:               o.Name,
		Slug:               o.Slug,
		SubscriptionStatus: o.SubscriptionStatus,
	})
}

type patchOrganizationRequest struct {
	Name *string `json:"name"`
	Slug *string `json:"slug"`
}

func (h *AdminOrganizationsHandler) Patch(w http.ResponseWriter, r *http.Request) {
	if !h.requirePlatformAdmin(w, r) {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid organization id")
		return
	}
	var body patchOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	o, err := h.orgRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "organization not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to load organization")
		}
		return
	}
	if body.Name != nil && strings.TrimSpace(*body.Name) != "" {
		o.Name = strings.TrimSpace(*body.Name)
	}
	if body.Slug != nil && strings.TrimSpace(*body.Slug) != "" {
		slug := entity.NormalizeOrganizationSlug(*body.Slug)
		if slug == "" {
			writeError(w, http.StatusBadRequest, "invalid slug")
			return
		}
		o.Slug = slug
	}
	if err := o.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.orgRepo.Update(r.Context(), o); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update organization")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type subscriptionCheckoutResponse struct {
	URL string `json:"url"`
}

func (h *AdminOrganizationsHandler) PostSubscriptionCheckout(w http.ResponseWriter, r *http.Request) {
	if !h.requirePlatformAdmin(w, r) {
		return
	}
	if h.subscriptionCheckoutUC == nil {
		writeError(w, http.StatusServiceUnavailable, "subscription checkout is not configured")
		return
	}
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid organization id")
		return
	}
	claims := authmw.GetUserClaims(r.Context())
	email := ""
	if claims != nil {
		email = strings.TrimSpace(claims.Email)
	}
	url, err := h.subscriptionCheckoutUC.Execute(r.Context(), orguc.CreateSubscriptionCheckoutInput{
		OrganizationID: orgID,
		CustomerEmail:  email,
	})
	if err != nil {
		if errors.Is(err, orguc.ErrSubscriptionCheckoutNotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "subscription checkout is not configured")
			return
		}
		var stripeSessErr *stripeinfra.CheckoutSessionError
		if errors.As(err, &stripeSessErr) {
			writeError(w, http.StatusBadRequest, stripeSessErr.Message)
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "organization not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to start subscription checkout")
		return
	}
	writeJSON(w, http.StatusOK, subscriptionCheckoutResponse{URL: url})
}

type addOrgMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *AdminOrganizationsHandler) PostMember(w http.ResponseWriter, r *http.Request) {
	if !h.requirePlatformAdmin(w, r) {
		return
	}
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid organization id")
		return
	}
	var body addOrgMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	if email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	role := entity.UserRole(strings.TrimSpace(body.Role))
	if role != entity.UserRoleOrganizer && role != entity.UserRoleStaff {
		writeError(w, http.StatusBadRequest, "role must be organizer or staff")
		return
	}
	u, err := h.userRepo.GetByEmail(r.Context(), email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to resolve user")
		}
		return
	}
	if err := h.userRepo.SetOrganizationAndRole(r.Context(), u.ID, orgID, role); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to assign organization")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
