package order

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var (
	ErrReservationNotFound  = errors.New("reservation not found")
	ErrReservationExpired   = errors.New("reservation has expired")
	ErrReservationWrongUser = errors.New("reservation does not belong to this user")
	ErrOrganizationMismatch = errors.New("order does not belong to this organization")
)

type CreateOrderInput struct {
	UserID                 uuid.UUID
	ReservationIDs       []uuid.UUID
	Buyer                entity.BuyerDetails
	ExpectedOrganizationID *uuid.UUID
}

type CreateOrderOutput struct {
	Order *entity.Order
}

type CreateOrderUseCase struct {
	reservationRepo repository.ReservationRepository
	seatRepo        repository.SeatRepository
	eventRepo       repository.EventRepository
	orderRepo       repository.OrderRepository
}

func NewCreateOrderUseCase(
	reservationRepo repository.ReservationRepository,
	seatRepo repository.SeatRepository,
	eventRepo repository.EventRepository,
	orderRepo repository.OrderRepository,
) *CreateOrderUseCase {
	return &CreateOrderUseCase{
		reservationRepo: reservationRepo,
		seatRepo:        seatRepo,
		eventRepo:       eventRepo,
		orderRepo:       orderRepo,
	}
}

func (uc *CreateOrderUseCase) Execute(ctx context.Context, input CreateOrderInput) (*CreateOrderOutput, error) {
	if len(input.ReservationIDs) == 0 {
		return nil, errors.New("at least one reservation is required")
	}

	reservations := make([]*entity.Reservation, 0, len(input.ReservationIDs))
	for _, resID := range input.ReservationIDs {
		res, err := uc.reservationRepo.GetByID(ctx, resID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return nil, ErrReservationNotFound
			}
			return nil, fmt.Errorf("create order: get reservation: %w", err)
		}
		if res.UserID != input.UserID {
			return nil, ErrReservationWrongUser
		}
		if res.Status != entity.ReservationStatusActive || res.IsExpired() {
			return nil, ErrReservationExpired
		}
		reservations = append(reservations, res)
	}

	var totalCents int64
	var serviceFeePercent float64
	for _, res := range reservations {
		seat, err := uc.seatRepo.GetByID(ctx, res.SeatID)
		if err != nil {
			return nil, fmt.Errorf("create order: get seat: %w", err)
		}
		if input.ExpectedOrganizationID != nil {
			event, err := uc.eventRepo.GetByID(ctx, seat.EventID)
			if err != nil {
				return nil, fmt.Errorf("create order: get event: %w", err)
			}
			if event.Venue == nil || event.Venue.OrganizationID != *input.ExpectedOrganizationID {
				return nil, ErrOrganizationMismatch
			}
		}
		totalCents += seat.PriceCents

		if serviceFeePercent == 0 {
			event, err := uc.eventRepo.GetByID(ctx, seat.EventID)
			if err != nil {
				return nil, fmt.Errorf("create order: get event: %w", err)
			}
			serviceFeePercent = event.ServiceFeePercent
		}
	}
	fee := int64(math.Round(float64(totalCents) * serviceFeePercent / 100))
	totalCents += fee

	order, err := entity.NewOrder(input.UserID, entity.OrderKindPrimary, input.ReservationIDs, nil, totalCents, "", input.Buyer)
	if err != nil {
		return nil, fmt.Errorf("create order: new order: %w", err)
	}
	if err := uc.orderRepo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("create order: persist: %w", err)
	}

	return &CreateOrderOutput{Order: order}, nil
}

// GetOrderUseCase fetches a single order by ID, enforcing ownership.
type GetOrderUseCase struct {
	orderRepo repository.OrderRepository
}

func NewGetOrderUseCase(orderRepo repository.OrderRepository) *GetOrderUseCase {
	return &GetOrderUseCase{orderRepo: orderRepo}
}

func (uc *GetOrderUseCase) Execute(ctx context.Context, orderID, userID uuid.UUID) (*entity.Order, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, repository.ErrNotFound
	}
	return order, nil
}

// ListOrdersUseCase lists all orders for a user.
type ListOrdersUseCase struct {
	orderRepo repository.OrderRepository
}

func NewListOrdersUseCase(orderRepo repository.OrderRepository) *ListOrdersUseCase {
	return &ListOrdersUseCase{orderRepo: orderRepo}
}

func (uc *ListOrdersUseCase) Execute(ctx context.Context, userID uuid.UUID) ([]*entity.Order, error) {
	return uc.orderRepo.ListByUserID(ctx, userID)
}
