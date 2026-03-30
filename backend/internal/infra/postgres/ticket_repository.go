package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.TicketRepository = (*TicketRepository)(nil)

const ticketDetailsQuery = `
SELECT
    t.id, t.order_id, t.event_id, t.seat_id, t.qr_code, t.status, t.purchased_at, t.created_at, t.updated_at,
    e.title, e.home_team, e.away_team, e.league, e.sport, e.starts_at, e.image_url,
    v.name  AS venue_name, v.city AS venue_city, v.state AS venue_state,
    s.section, s.row, s.number, s.price_cents
FROM tickets t
JOIN orders   o ON o.id = t.order_id
JOIN events   e ON e.id = t.event_id
JOIN seats    s ON s.id = t.seat_id
JOIN venues   v ON v.id = e.venue_id
WHERE o.user_id = $1
ORDER BY t.purchased_at DESC
`

const ticketDetailsQueryByID = `
SELECT
    t.id, t.order_id, t.event_id, t.seat_id, t.qr_code, t.status, t.purchased_at, t.created_at, t.updated_at,
    e.title, e.home_team, e.away_team, e.league, e.sport, e.starts_at, e.image_url,
    v.name  AS venue_name, v.city AS venue_city, v.state AS venue_state,
    s.section, s.row, s.number, s.price_cents
FROM tickets t
JOIN orders   o ON o.id = t.order_id
JOIN events   e ON e.id = t.event_id
JOIN seats    s ON s.id = t.seat_id
JOIN venues   v ON v.id = e.venue_id
WHERE t.id = $1
`

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

func (r *TicketRepository) GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*repository.TicketWithDetails, error) {
	row := r.pool.QueryRow(ctx, ticketDetailsQueryByID, id)
	d, err := scanTicketDetails(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("TicketRepository.GetByIDWithDetails: %w", err)
	}
	return d, nil
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

func (r *TicketRepository) ListByUserIDWithDetails(ctx context.Context, userID uuid.UUID) ([]*repository.TicketWithDetails, error) {
	rows, err := r.pool.Query(ctx, ticketDetailsQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("TicketRepository.ListByUserIDWithDetails: %w", err)
	}
	defer rows.Close()

	var tickets []*repository.TicketWithDetails
	for rows.Next() {
		d, err := scanTicketDetails(rows)
		if err != nil {
			return nil, fmt.Errorf("TicketRepository.ListByUserIDWithDetails scan: %w", err)
		}
		tickets = append(tickets, d)
	}
	return tickets, rows.Err()
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

// scanner is implemented by both pgx.Row and pgx.Rows
type scanner interface {
	Scan(dest ...any) error
}

func scanTicketDetails(row scanner) (*repository.TicketWithDetails, error) {
	var (
		d        repository.TicketWithDetails
		startsAt time.Time
	)
	err := row.Scan(
		&d.ID,
		&d.OrderID,
		&d.EventID,
		&d.SeatID,
		&d.QRCode,
		&d.Status,
		&d.PurchasedAt,
		&d.CreatedAt,
		&d.UpdatedAt,
		&d.EventTitle,
		&d.EventHomeTeam,
		&d.EventAwayTeam,
		&d.EventLeague,
		&d.EventSport,
		&startsAt,
		&d.EventImageURL,
		&d.VenueName,
		&d.VenueCity,
		&d.VenueState,
		&d.SeatSection,
		&d.SeatRow,
		&d.SeatNumber,
		&d.SeatPriceCents,
	)
	if err != nil {
		return nil, err
	}
	d.EventStartsAt = startsAt
	return &d, nil
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
