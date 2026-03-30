package user

import (
	"context"
	"errors"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailAlreadyExists = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

type RegisterInput struct {
	Name     string
	Email    string
	Password string
	CPF      string
	Phone    string
}

type RegisterOutput struct {
	User      *entity.User
	TokenPair *service.TokenPair
}

type RegisterUseCase struct {
	userRepo     repository.UserRepository
	tokenService service.TokenService
}

func NewRegisterUseCase(userRepo repository.UserRepository, tokenService service.TokenService) *RegisterUseCase {
	return &RegisterUseCase{
		userRepo:     userRepo,
		tokenService: tokenService,
	}
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	existing, _ := uc.userRepo.GetByEmail(ctx, input.Email)
	if existing != nil {
		return nil, ErrEmailAlreadyExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u, err := entity.NewUser(input.Name, input.Email, string(hash), input.CPF, input.Phone)
	if err != nil {
		return nil, err
	}

	if err := uc.userRepo.Create(ctx, u); err != nil {
		return nil, err
	}

	pair, err := uc.tokenService.GenerateTokenPair(service.TokenClaims{
		UserID: u.ID,
		Email:  u.Email,
		Role:   string(u.Role),
	})
	if err != nil {
		return nil, err
	}

	return &RegisterOutput{
		User:      u,
		TokenPair: pair,
	}, nil
}
