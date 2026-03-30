package user

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var ErrInvalidResetToken = errors.New("invalid or expired reset token")

// PasswordTokenStore is the minimal interface for password reset token storage.
type PasswordTokenStore interface {
	SavePasswordResetToken(ctx context.Context, token string, userID uuid.UUID) error
	GetPasswordResetToken(ctx context.Context, token string) (uuid.UUID, error)
	DeletePasswordResetToken(ctx context.Context, token string) error
}

// ForgotPasswordUseCase generates a password reset token for the given email.
type ForgotPasswordUseCase struct {
	userRepo   repository.UserRepository
	tokenStore PasswordTokenStore
}

func NewForgotPasswordUseCase(userRepo repository.UserRepository, tokenStore PasswordTokenStore) *ForgotPasswordUseCase {
	return &ForgotPasswordUseCase{userRepo: userRepo, tokenStore: tokenStore}
}

type ForgotPasswordOutput struct {
	// Token is the reset token. In production, this would be emailed to the user.
	Token string
}

func (uc *ForgotPasswordUseCase) Execute(ctx context.Context, email string) (*ForgotPasswordOutput, error) {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			// Don't reveal whether the email exists
			return &ForgotPasswordOutput{Token: ""}, nil
		}
		return nil, fmt.Errorf("ForgotPassword: get user: %w", err)
	}

	token := uuid.New().String()
	if err := uc.tokenStore.SavePasswordResetToken(ctx, token, user.ID); err != nil {
		return nil, fmt.Errorf("ForgotPassword: save token: %w", err)
	}

	return &ForgotPasswordOutput{Token: token}, nil
}

// ResetPasswordUseCase validates a reset token and updates the user's password.
type ResetPasswordUseCase struct {
	userRepo   repository.UserRepository
	tokenStore PasswordTokenStore
}

func NewResetPasswordUseCase(userRepo repository.UserRepository, tokenStore PasswordTokenStore) *ResetPasswordUseCase {
	return &ResetPasswordUseCase{userRepo: userRepo, tokenStore: tokenStore}
}

func (uc *ResetPasswordUseCase) Execute(ctx context.Context, token, newPassword string) error {
	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	userID, err := uc.tokenStore.GetPasswordResetToken(ctx, token)
	if err != nil {
		return ErrInvalidResetToken
	}

	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("ResetPassword: get user: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return fmt.Errorf("ResetPassword: hash password: %w", err)
	}
	user.PasswordHash = string(hash)

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("ResetPassword: update user: %w", err)
	}

	// Invalidate the token
	_ = uc.tokenStore.DeletePasswordResetToken(ctx, token)
	return nil
}
