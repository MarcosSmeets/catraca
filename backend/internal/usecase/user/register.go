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
	ErrCPFAlreadyExists   = errors.New("CPF already registered")
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
	cpfPepper    string
}

func NewRegisterUseCase(userRepo repository.UserRepository, tokenService service.TokenService, cpfPepper string) *RegisterUseCase {
	return &RegisterUseCase{
		userRepo:     userRepo,
		tokenService: tokenService,
		cpfPepper:    cpfPepper,
	}
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	existing, _ := uc.userRepo.GetByEmail(ctx, input.Email)
	if existing != nil {
		return nil, ErrEmailAlreadyExists
	}

	cpfHash := entity.HashCPF(entity.NormalizeCPF(input.CPF), uc.cpfPepper)
	cpfTaken, err := uc.userRepo.ExistsByCPFHash(ctx, cpfHash)
	if err != nil {
		return nil, err
	}
	if cpfTaken {
		return nil, ErrCPFAlreadyExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return nil, err
	}

	u, err := entity.NewUser(input.Name, input.Email, string(hash), input.CPF, input.Phone, uc.cpfPepper)
	if err != nil {
		return nil, err
	}

	if err := uc.userRepo.Create(ctx, u); err != nil {
		return nil, err
	}

	pair, err := uc.tokenService.GenerateTokenPair(tokenClaimsFromUser(u))
	if err != nil {
		return nil, err
	}

	return &RegisterOutput{
		User:      u,
		TokenPair: pair,
	}, nil
}
