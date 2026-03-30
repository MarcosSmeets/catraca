package user

import (
	"context"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Email    string
	Password string
}

type LoginOutput struct {
	User      *entity.User
	TokenPair *service.TokenPair
}

type LoginUseCase struct {
	userRepo     repository.UserRepository
	tokenService service.TokenService
}

func NewLoginUseCase(userRepo repository.UserRepository, tokenService service.TokenService) *LoginUseCase {
	return &LoginUseCase{
		userRepo:     userRepo,
		tokenService: tokenService,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	u, err := uc.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	pair, err := uc.tokenService.GenerateTokenPair(service.TokenClaims{
		UserID: u.ID,
		Email:  u.Email,
		Role:   string(u.Role),
	})
	if err != nil {
		return nil, err
	}

	return &LoginOutput{
		User:      u,
		TokenPair: pair,
	}, nil
}
