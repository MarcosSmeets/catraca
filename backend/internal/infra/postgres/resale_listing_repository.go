package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.ResaleListingRepository = (*ResaleListingRepository)(nil)

type ResaleListingRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewResaleListingRepository(pool *pgxpool.Pool) *ResaleListingRepository {
	return &ResaleListingRepository{pool: pool, queries: pgdb.New(pool)}
}

func (r *ResaleListingRepository) Insert(ctx context.Context, listing repository.ResaleListing) error {
	_, err := r.queries.InsertTicketResaleListing(ctx, pgdb.InsertTicketResaleListingParams{
		ID:           listing.ID,
		TicketID:     listing.TicketID,
		SellerUserID: listing.SellerUserID,
		PriceCents:   listing.PriceCents,
		Status:       listing.Status,
	})
	if err != nil {
		return fmt.Errorf("ResaleListingRepository.Insert: %w", err)
	}
	return nil
}

func (r *ResaleListingRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.ResaleListing, error) {
	row, err := r.queries.GetTicketResaleListingByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ResaleListingRepository.GetByID: %w", err)
	}
	return dbResaleListing(row), nil
}

func (r *ResaleListingRepository) GetActiveByTicketID(ctx context.Context, ticketID uuid.UUID) (*repository.ResaleListing, error) {
	row, err := r.queries.GetActiveTicketResaleListingByTicketID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ResaleListingRepository.GetActiveByTicketID: %w", err)
	}
	return dbResaleListing(row), nil
}

func (r *ResaleListingRepository) ListActiveByEventID(ctx context.Context, eventID uuid.UUID) ([]repository.ResaleListingEventRow, error) {
	rows, err := r.queries.ListActiveResaleListingsByEventID(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("ResaleListingRepository.ListActiveByEventID: %w", err)
	}
	out := make([]repository.ResaleListingEventRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, repository.ResaleListingEventRow{
			ID:           row.ID,
			TicketID:     row.TicketID,
			SellerUserID: row.SellerUserID,
			PriceCents:   row.PriceCents,
			Status:       row.Status,
			CreatedAt:    row.CreatedAt,
			UpdatedAt:    row.UpdatedAt,
			EventID:      row.EventID,
			SeatSection:  row.SeatSection,
			SeatRow:      row.SeatRow,
			SeatNumber:   row.SeatNumber,
		})
	}
	return out, nil
}

func (r *ResaleListingRepository) ListBySellerUserID(ctx context.Context, sellerUserID uuid.UUID) ([]repository.ResaleListing, error) {
	rows, err := r.queries.ListTicketResaleListingsBySellerUserID(ctx, sellerUserID)
	if err != nil {
		return nil, fmt.Errorf("ResaleListingRepository.ListBySellerUserID: %w", err)
	}
	out := make([]repository.ResaleListing, 0, len(rows))
	for _, row := range rows {
		out = append(out, *dbResaleListing(row))
	}
	return out, nil
}

func (r *ResaleListingRepository) Cancel(ctx context.Context, id, sellerUserID uuid.UUID) error {
	if err := r.queries.CancelTicketResaleListing(ctx, pgdb.CancelTicketResaleListingParams{
		ID:           id,
		SellerUserID: sellerUserID,
	}); err != nil {
		return fmt.Errorf("ResaleListingRepository.Cancel: %w", err)
	}
	return nil
}

func (r *ResaleListingRepository) MarkSold(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.MarkTicketResaleListingSold(ctx, id); err != nil {
		return fmt.Errorf("ResaleListingRepository.MarkSold: %w", err)
	}
	return nil
}

func (r *ResaleListingRepository) HasPendingOrderForListing(ctx context.Context, listingID uuid.UUID) (bool, error) {
	ok, err := r.queries.HasPendingResaleOrderForListing(ctx, pgtype.UUID{Bytes: listingID, Valid: true})
	if err != nil {
		return false, fmt.Errorf("ResaleListingRepository.HasPendingOrderForListing: %w", err)
	}
	return ok, nil
}

func dbResaleListing(row pgdb.TicketResaleListing) *repository.ResaleListing {
	return &repository.ResaleListing{
		ID:           row.ID,
		TicketID:     row.TicketID,
		SellerUserID: row.SellerUserID,
		PriceCents:   row.PriceCents,
		Status:       row.Status,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}
