package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/marcos-smeets/catraca/backend/test/mock"
)

func TestPostMember_authorization(t *testing.T) {
	orgID := uuid.New()
	otherOrgID := uuid.New()
	targetUser := factory.NewTestUser()
	targetUser.Email = "member@example.com"

	orgActive := &entity.Organization{
		ID:                 orgID,
		Name:               "Acme",
		Slug:               "acme",
		SubscriptionStatus: entity.SubscriptionActive,
	}
	orgInactive := &entity.Organization{
		ID:                 orgID,
		Name:               "Acme",
		Slug:               "acme",
		SubscriptionStatus: entity.SubscriptionInactive,
	}

	tests := []struct {
		name       string
		claims     *service.TokenClaims
		orgRepo    *mock.OrganizationRepository
		body       map[string]string
		wantStatus int
	}{
		{
			name: "platform_admin organizer",
			claims: &service.TokenClaims{
				UserID: uuid.New(),
				Role:   string(entity.UserRolePlatformAdmin),
				Email:  "plat@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgActive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "organizer"},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "organizer staff same org active subscription",
			claims: &service.TokenClaims{
				UserID:           uuid.New(),
				Role:             string(entity.UserRoleOrganizer),
				OrganizationID:   &orgID,
				Email:            "org@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgActive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "staff"},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "tenant admin role staff same org",
			claims: &service.TokenClaims{
				UserID:           uuid.New(),
				Role:             string(entity.UserRoleAdmin),
				OrganizationID:   &orgID,
				Email:            "legacy-admin@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgActive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "staff"},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "organizer organizer forbidden",
			claims: &service.TokenClaims{
				UserID:           uuid.New(),
				Role:             string(entity.UserRoleOrganizer),
				OrganizationID:   &orgID,
				Email:            "org@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgActive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "organizer"},
			wantStatus: http.StatusForbidden,
		},
		{
			name: "organizer wrong org",
			claims: &service.TokenClaims{
				UserID:           uuid.New(),
				Role:             string(entity.UserRoleOrganizer),
				OrganizationID:   &otherOrgID,
				Email:            "org@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgActive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "staff"},
			wantStatus: http.StatusForbidden,
		},
		{
			name: "organizer inactive subscription",
			claims: &service.TokenClaims{
				UserID:           uuid.New(),
				Role:             string(entity.UserRoleOrganizer),
				OrganizationID:   &orgID,
				Email:            "org@example.com",
			},
			orgRepo: func() *mock.OrganizationRepository {
				r := mock.NewOrganizationRepository()
				r.Seed(orgInactive)
				return r
			}(),
			body:       map[string]string{"email": targetUser.Email, "role": "staff"},
			wantStatus: http.StatusPaymentRequired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mock.NewUserRepository()
			if err := userRepo.Create(context.Background(), targetUser); err != nil {
				t.Fatal(err)
			}

			h := NewAdminOrganizationsHandler(tt.orgRepo, userRepo, nil)
			payload, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/admin/organizations/"+orgID.String()+"/members", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", orgID.String())
			ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
			ctx = context.WithValue(ctx, authmw.UserClaimsKey, tt.claims)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.PostMember(rr, req)

			if rr.Code != tt.wantStatus {
				t.Fatalf("status: got %d want %d body=%s", rr.Code, tt.wantStatus, rr.Body.String())
			}

			if tt.wantStatus == http.StatusNoContent {
				u, err := userRepo.GetByEmail(context.Background(), targetUser.Email)
				if err != nil {
					t.Fatal(err)
				}
				if u.OrganizationID == nil || *u.OrganizationID != orgID {
					t.Fatalf("expected user linked to org")
				}
				wantRole := entity.UserRole(tt.body["role"])
				if u.Role != wantRole {
					t.Fatalf("role: got %s want %s", u.Role, wantRole)
				}
			}
		})
	}
}
