package entity

import (
	"crypto/hmac"
	"crypto/sha256"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
)

// ErrInvalidCPF is returned when the CPF fails the check-digit validation.
var ErrInvalidCPF = errors.New("invalid CPF")

type UserRole string

const (
	UserRoleUser      UserRole = "user"
	UserRoleAdmin     UserRole = "admin"
	UserRoleOrganizer UserRole = "organizer"
	UserRoleStaff     UserRole = "staff"
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

func NewUser(name, email, passwordHash, cpf, phone, cpfPepper string) (*User, error) {
	normalized := NormalizeCPF(cpf)
	if !ValidateCPF(normalized) {
		return nil, ErrInvalidCPF
	}
	u := &User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: passwordHash,
		CPFHash:      HashCPF(normalized, cpfPepper),
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

// NormalizeCPF strips all non-digit characters from a CPF string.
func NormalizeCPF(cpf string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsDigit(r) {
			return r
		}
		return -1
	}, cpf)
}

// ValidateCPF checks the two verification digits of a normalized (digits-only) CPF.
func ValidateCPF(cpf string) bool {
	if len(cpf) != 11 {
		return false
	}
	// Reject sequences of identical digits (e.g. 000.000.000-00)
	allSame := true
	for i := 1; i < 11; i++ {
		if cpf[i] != cpf[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return false
	}
	// First check digit
	sum := 0
	for i := 0; i < 9; i++ {
		sum += int(cpf[i]-'0') * (10 - i)
	}
	rem := sum % 11
	d1 := 0
	if rem >= 2 {
		d1 = 11 - rem
	}
	if int(cpf[9]-'0') != d1 {
		return false
	}
	// Second check digit
	sum = 0
	for i := 0; i < 10; i++ {
		sum += int(cpf[i]-'0') * (11 - i)
	}
	rem = sum % 11
	d2 := 0
	if rem >= 2 {
		d2 = 11 - rem
	}
	return int(cpf[10]-'0') == d2
}

// HashCPF creates an HMAC-SHA256 of the normalized CPF using the provided pepper.
// The pepper must be kept secret; without it the hash cannot be reproduced.
func HashCPF(cpf, pepper string) string {
	mac := hmac.New(sha256.New, []byte(pepper))
	mac.Write([]byte(cpf))
	return fmt.Sprintf("%x", mac.Sum(nil))
}
