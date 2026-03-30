package nbb

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

// venueInfo holds the city and state (2-char Brazilian UF) for a known NBB arena.
type venueInfo struct {
	City  string
	State string
}

// knownNBBVenues maps common NBB gymnasium names to their location data.
// This covers all teams present in the 2025/2026 season.
var knownNBBVenues = map[string]venueInfo{
	// Basket Osasco (SP)
	"Gin. Geodésico":               {"Osasco", "SP"},
	"Ginásio Geodésico":             {"Osasco", "SP"},
	// Bauru Basket (SP)
	"Gin. Panela de Pressão":        {"Bauru", "SP"},
	"Ginásio Panela de Pressão":     {"Bauru", "SP"},
	// Botafogo (RJ)
	"Ginásio Oscar Zelaya":          {"Rio de Janeiro", "RJ"},
	// CAIXA/Brasília Basquete (DF)
	"Arena BRB Nilson Nelson":       {"Brasília", "DF"},
	// Caxias do Sul Basquete (RS)
	"Sesi":                          {"Caxias do Sul", "RS"},
	// Corinthians (SP)
	"Ginásio Wlamir Marques":        {"São Paulo", "SP"},
	"Gin. Wlamir Marques":           {"São Paulo", "SP"},
	// Cruzeiro Basquete (MG)
	"Gin. Dona Salomé - Barro Preto": {"Belo Horizonte", "MG"},
	"Gin. Dona Salomé":              {"Belo Horizonte", "MG"},
	// Flamengo (RJ)
	"Ginásio do Maracanãzinho":      {"Rio de Janeiro", "RJ"},
	// Fortaleza Basquete Cearense (CE)
	"UNIFOR":                        {"Fortaleza", "CE"},
	"Centro de Formação Olímpica":   {"Fortaleza", "CE"},
	// Sesi Franca (SP)
	"Ginásio Pedrocão":              {"Franca", "SP"},
	// KTO Minas (MG)
	"Arena UniBH":                   {"Belo Horizonte", "MG"},
	// Mogi Basquete (SP)
	"Prof. Hugo Ramos":              {"Mogi das Cruzes", "SP"},
	// Pato Basquete (PR)
	"Ginásio do Sesi":               {"Pato Branco", "PR"},
	// Paulistano (SP)
	"Gin. Antonio Prado Jr":         {"São Paulo", "SP"},
	"Ginásio Antonio Prado Jr":      {"São Paulo", "SP"},
	// Pinheiros (SP)
	"Poliesportivo H. Villaboim":    {"São Paulo", "SP"},
	"Poliesportivo Henrique Villaboim": {"São Paulo", "SP"},
	// Conta Simples Rio Claro (SP)
	"Gin. Felipe Karam":             {"Rio Claro", "SP"},
	// Mr. Moo São José Basketball (SP)
	"Gin. Linneu de Moura":          {"São José dos Campos", "SP"},
	"Farma Conde Arena":             {"São José dos Campos", "SP"},
	// Ceisc/União Corinthians (RS)
	"Gin. Poliesportivo Arnão":      {"Novo Hamburgo", "RS"},
	// UNIFACISA (PB)
	"Arena UNIFACISA":               {"Campina Grande", "PB"},
	// Vasco da Gama (RJ)
	"Ginásio de São Januário":       {"Rio de Janeiro", "RJ"},
	// Generic / multi-use
	"Arena BRB Nilson Nelson - Brasília": {"Brasília", "DF"},
}

// defaultVenueInfo is used for any arena not found in the lookup table.
var defaultVenueInfo = venueInfo{City: "Brasil", State: "SP"}

// lookupVenueInfo returns location data for a given venue name.
// It first tries an exact match, then a case-insensitive prefix match.
func lookupVenueInfo(name string) venueInfo {
	if info, ok := knownNBBVenues[name]; ok {
		return info
	}
	nameLower := strings.ToLower(name)
	for key, info := range knownNBBVenues {
		if strings.Contains(nameLower, strings.ToLower(key)) ||
			strings.Contains(strings.ToLower(key), nameLower) {
			return info
		}
	}
	return defaultVenueInfo
}

// MapVenues resolves a unique venue name for each game to a VenueID in the
// database. Venues that do not yet exist are created.
// Returns a map from venue name to uuid.UUID.
func MapVenues(
	ctx context.Context,
	games []ScrapedGame,
	venueRepo repository.VenueRepository,
) (map[string]uuid.UUID, error) {
	// Collect unique venue names.
	unique := make(map[string]struct{})
	for _, g := range games {
		if g.VenueName != "" {
			unique[g.VenueName] = struct{}{}
		}
	}

	// Load all existing venues once.
	existing, err := venueRepo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("MapVenues: list venues: %w", err)
	}

	byName := make(map[string]*entity.Venue, len(existing))
	for _, v := range existing {
		byName[strings.ToLower(v.Name)] = v
	}

	result := make(map[string]uuid.UUID, len(unique))

	for venueName := range unique {
		// Case-insensitive lookup against existing venues.
		if v, ok := byName[strings.ToLower(venueName)]; ok {
			result[venueName] = v.ID
			continue
		}

		// Create a stub venue record.
		info := lookupVenueInfo(venueName)
		newVenue, err := entity.NewVenue(venueName, info.City, info.State, 5000)
		if err != nil {
			return nil, fmt.Errorf("MapVenues: create venue entity %q: %w", venueName, err)
		}

		if err := venueRepo.Create(ctx, newVenue); err != nil {
			return nil, fmt.Errorf("MapVenues: persist venue %q: %w", venueName, err)
		}

		result[venueName] = newVenue.ID
		byName[strings.ToLower(venueName)] = newVenue
	}

	return result, nil
}
