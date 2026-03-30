package user

import (
	"context"

	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

type RefreshOutput struct {
	TokenPair *service.TokenPair
}

type RefreshUseCase struct {
	userRepo     repository.UserRepository
	tokenService service.TokenService
}

func NewRefreshUseCase(userRepo repository.UserRepository, tokenService service.TokenService) *RefreshUseCase {
	return &RefreshUseCase{
		userRepo:     userRepo,
		tokenService: tokenService,
	}
}

func (uc *RefreshUseCase) Execute(ctx context.Context, refreshToken string) (*RefreshOutput, error) {
	claims, err := uc.tokenService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	u, err := uc.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
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

	return &RefreshOutput{
		TokenPair: pair,
	}, nil
}
