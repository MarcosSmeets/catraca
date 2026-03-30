package entity

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"net/mail"
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	UserRoleUser      UserRole = "user"
	UserRoleAdmin     UserRole = "admin"
	UserRoleOrganizer UserRole = "organizer"
)

type User struct {
	ID           uuid.UUID
	Name         string
	Email        string
	PasswordHash string
	CPFHash      string
	Phone        string
	Role         UserRole
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

func NewUser(name, email, passwordHash, cpf, phone string) (*User, error) {
	u := &User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: passwordHash,
		CPFHash:      HashCPF(cpf),
		Phone:        phone,
		Role:         UserRoleUser,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := u.Validate(); err != nil {
		return nil, err
	}
	return u, nil
}

func (u *User) Validate() error {
	if u.Name == "" {
		return errors.New("user name is required")
	}
	if u.Email == "" {
		return errors.New("user email is required")
	}
	if _, err := mail.ParseAddress(u.Email); err != nil {
		return errors.New("invalid email format")
	}
	if u.PasswordHash == "" {
		return errors.New("user password hash is required")
	}
	if u.CPFHash == "" {
		return errors.New("user CPF hash is required")
	}
	return nil
}

func HashCPF(cpf string) string {
	h := sha256.Sum256([]byte(cpf))
	return fmt.Sprintf("%x", h)
}
