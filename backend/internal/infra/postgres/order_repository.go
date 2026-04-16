package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.OrderRepository = (*OrderRepository)(nil)

type OrderRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
	return &OrderRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *OrderRepository) Create(ctx context.Context, o *entity.Order) error {
	var resaleListingPg pgtype.UUID
	if o.ResaleListingID != nil {
		resaleListingPg = pgtype.UUID{Bytes: *o.ResaleListingID, Valid: true}
	}
	_, err := r.queries.CreateOrder(ctx, pgdb.CreateOrderParams{
		ID:                o.ID,
		UserID:            o.UserID,
		TotalCents:        o.TotalCents,
		StripePaymentID:   o.StripePaymentID,
		Status:            o.Status.String(),
		BuyerName:         o.BuyerName,
		BuyerEmail:        o.BuyerEmail,
		BuyerCpf:          o.BuyerCPF,
		BuyerPhone:        o.BuyerPhone,
		BuyerCep:          o.BuyerCEP,
		BuyerStreet:       o.BuyerStreet,
		BuyerNeighborhood: o.BuyerNeighborhood,
		BuyerCity:         o.BuyerCity,
		BuyerState:        o.BuyerState,
		Kind:              string(o.Kind),
		ResaleListingID:   resaleListingPg,
	})
	if err != nil {
		return fmt.Errorf("OrderRepository.Create: %w", err)
	}
	for _, resID := range o.ReservationIDs {
		if err := r.queries.CreateOrderReservation(ctx, pgdb.CreateOrderReservationParams{
			OrderID:       o.ID,
			ReservationID: resID,
		}); err != nil {
			return fmt.Errorf("OrderRepository.Create link reservation: %w", err)
		}
	}
	return nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Order, error) {
	row, err := r.queries.GetOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("OrderRepository.GetByID: %w", err)
	}
	resIDs, err := r.queries.ListOrderReservationIDs(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.GetByID list reservation IDs: %w", err)
	}
	return dbOrderToEntity(row, resIDs), nil
}

func (r *OrderRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Order, error) {
	rows, err := r.queries.ListOrdersByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.ListByUserID: %w", err)
	}
	orders := make([]*entity.Order, 0, len(rows))
	for _, row := range rows {
		resIDs, err := r.queries.ListOrderReservationIDs(ctx, row.ID)
		if err != nil {
			return nil, fmt.Errorf("OrderRepository.ListByUserID list reservation IDs: %w", err)
		}
		orders = append(orders, dbOrderToEntity(row, resIDs))
	}
	return orders, nil
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status entity.OrderStatus) error {
	err := r.queries.UpdateOrderStatus(ctx, pgdb.UpdateOrderStatusParams{
		ID:     id,
		Status: status.String(),
	})
	if err != nil {
		return fmt.Errorf("OrderRepository.UpdateStatus: %w", err)
	}
	return nil
}

func (r *OrderRepository) UpdateStripePaymentID(ctx context.Context, id uuid.UUID, stripePaymentID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE orders SET stripe_payment_id = $2 WHERE id = $1`,
		id, stripePaymentID,
	)
	if err != nil {
		return fmt.Errorf("OrderRepository.UpdateStripePaymentID: %w", err)
	}
	return nil
}

func (r *OrderRepository) HasPendingOrderForReservation(ctx context.Context, reservationID uuid.UUID) (bool, error) {
	hasPending, err := r.queries.HasPendingOrderForReservation(ctx, reservationID)
	if err != nil {
		return false, fmt.Errorf("OrderRepository.HasPendingOrderForReservation: %w", err)
	}
	return hasPending, nil
}

func dbOrderToEntity(o pgdb.Order, resIDs []uuid.UUID) *entity.Order {
	out := &entity.Order{
		ID:                o.ID,
		UserID:            o.UserID,
		Kind:              entity.OrderKind(o.Kind),
		ReservationIDs:    resIDs,
		TotalCents:        o.TotalCents,
		StripePaymentID:   o.StripePaymentID,
		Status:            entity.OrderStatus(o.Status),
		CreatedAt:         o.CreatedAt,
		UpdatedAt:         o.UpdatedAt,
		BuyerName:         o.BuyerName,
		BuyerEmail:        o.BuyerEmail,
		BuyerCPF:          o.BuyerCpf,
		BuyerPhone:        o.BuyerPhone,
		BuyerCEP:          o.BuyerCep,
		BuyerStreet:       o.BuyerStreet,
		BuyerNeighborhood: o.BuyerNeighborhood,
		BuyerCity:         o.BuyerCity,
		BuyerState:        o.BuyerState,
	}
	if o.ResaleListingID.Valid {
		u := uuid.UUID(o.ResaleListingID.Bytes)
		out.ResaleListingID = &u
	}
	return out
}
