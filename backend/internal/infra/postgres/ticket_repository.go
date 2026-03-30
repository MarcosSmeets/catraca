package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.TicketRepository = (*TicketRepository)(nil)

type TicketRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewTicketRepository(pool *pgxpool.Pool) *TicketRepository {
	return &TicketRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *TicketRepository) Create(ctx context.Context, t *entity.Ticket) error {
	_, err := r.queries.CreateTicket(ctx, pgdb.CreateTicketParams{
		ID:          t.ID,
		OrderID:     t.OrderID,
		EventID:     t.EventID,
		SeatID:      t.SeatID,
		QrCode:      t.QRCode,
		Status:      t.Status.String(),
		PurchasedAt: t.PurchasedAt,
	})
	if err != nil {
		return fmt.Errorf("TicketRepository.Create: %w", err)
	}
	return nil
}

func (r *TicketRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Ticket, error) {
	row, err := r.queries.GetTicketByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("TicketRepository.GetByID: %w", err)
	}
	return dbTicketToEntity(row), nil
}

func (r *TicketRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Ticket, error) {
	rows, err := r.queries.ListTicketsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("TicketRepository.ListByUserID: %w", err)
	}
	tickets := make([]*entity.Ticket, 0, len(rows))
	for _, row := range rows {
		tickets = append(tickets, dbTicketToEntity(row))
	}
	return tickets, nil
}

func (r *TicketRepository) ListByOrderID(ctx context.Context, orderID uuid.UUID) ([]*entity.Ticket, error) {
	rows, err := r.queries.ListTicketsByOrderID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("TicketRepository.ListByOrderID: %w", err)
	}
	tickets := make([]*entity.Ticket, 0, len(rows))
	for _, row := range rows {
		tickets = append(tickets, dbTicketToEntity(row))
	}
	return tickets, nil
}

func dbTicketToEntity(t pgdb.Ticket) *entity.Ticket {
	return &entity.Ticket{
		ID:          t.ID,
		OrderID:     t.OrderID,
		EventID:     t.EventID,
		SeatID:      t.SeatID,
		QRCode:      t.QrCode,
		Status:      entity.TicketStatus(t.Status),
		PurchasedAt: t.PurchasedAt,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}
