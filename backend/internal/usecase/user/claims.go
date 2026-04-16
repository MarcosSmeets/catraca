package user

import (
	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

func tokenClaimsFromUser(u *entity.User) service.TokenClaims {
	c := service.TokenClaims{
		UserID: u.ID,
		Email:  u.Email,
		Role:   string(u.Role),
	}
	if u.OrganizationID != nil && *u.OrganizationID != uuid.Nil {
		id := *u.OrganizationID
		c.OrganizationID = &id
	}
	return c
}
