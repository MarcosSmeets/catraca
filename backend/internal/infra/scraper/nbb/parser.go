package nbb

import (
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/PuerkitoBio/goquery"
)

// ScrapedGame holds the raw data extracted from a single row of the LNB schedule table.
type ScrapedGame struct {
	// Date is the scheduled start time in America/Sao_Paulo timezone.
	Date time.Time
	// HomeTeam is the name of the home team.
	HomeTeam string
	// AwayTeam is the name of the visiting team.
	AwayTeam string
	// HomeScore is the points scored by the home team, or -1 if the game has not been played.
	HomeScore int
	// AwayScore is the points scored by the away team, or -1 if the game has not been played.
	AwayScore int
	// Round is the round label, e.g. "1ª RODADA".
	Round string
	// Phase is the phase label, e.g. "1º TURNO".
	Phase string
	// Season is the championship season, e.g. "2025/2026".
	Season string
	// VenueName is the name of the gymnasium / arena.
	VenueName string
	// Played reports whether the game has already taken place.
	Played bool
}

var brtz *time.Location

func init() {
	var err error
	brtz, err = time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		brtz = time.FixedZone("BRT", -3*60*60)
	}
}

// ParseTable parses the outer HTML of the LNB games table and returns a slice of ScrapedGame.
// Rows that cannot be meaningfully parsed are silently skipped.
func ParseTable(tableHTML string) ([]ScrapedGame, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(tableHTML))
	if err != nil {
		return nil, fmt.Errorf("nbb.ParseTable: %w", err)
	}

	var games []ScrapedGame

	doc.Find("tbody tr").Each(func(_ int, row *goquery.Selection) {
		game, ok := parseRow(row)
		if ok {
			games = append(games, game)
		}
	})

	return games, nil
}

// parseRow extracts a ScrapedGame from a single <tr> element.
// The LNB table uses CSS classes to identify each column:
//
//	td.date_value.show-for-medium         → date + time
//	td.home_team_value span.team-shortname → home team name
//	td.score_value                         → score (span.home, span.away)
//	td.visitor_team_value span.team-shortname → away team
//	td.game_value                          → round
//	td.stage_value.hide_value              → phase
//	td.champ_value                         → season
//	td.gym_value                           → venue
func parseRow(row *goquery.Selection) (ScrapedGame, bool) {
	// Date — use show-for-medium variant to avoid the mobile duplicate
	dateCell := row.Find("td.date_value.show-for-medium")
	if dateCell.Length() == 0 {
		return ScrapedGame{}, false
	}
	spans := dateCell.Find("span")
	if spans.Length() < 2 {
		return ScrapedGame{}, false
	}
	datePart := cleanText(spans.Eq(0).Text())
	timePart := cleanText(spans.Eq(1).Text())
	dateStr := datePart + " " + timePart
	date, err := parseDateTime(dateStr)
	if err != nil {
		return ScrapedGame{}, false
	}

	// Home team
	homeTeam := cleanText(row.Find("td.home_team_value span.team-shortname").First().Text())
	if homeTeam == "" {
		return ScrapedGame{}, false
	}

	// Away team
	awayTeam := cleanText(row.Find("td.visitor_team_value span.team-shortname").First().Text())
	if awayTeam == "" {
		return ScrapedGame{}, false
	}

	// Score — look for span.home and span.away inside td.score_value
	scoreCell := row.Find("td.score_value")
	homeScoreStr := cleanText(scoreCell.Find("span.home").First().Text())
	awayScoreStr := cleanText(scoreCell.Find("span.away").First().Text())

	homeScore, awayScore, played := -1, -1, false
	if homeScoreStr != "" && awayScoreStr != "" {
		if h, err := strconv.Atoi(homeScoreStr); err == nil {
			if a, err := strconv.Atoi(awayScoreStr); err == nil {
				homeScore = h
				awayScore = a
				played = true
			}
		}
	}

	// Round
	roundCell := row.Find("td.game_value")
	round := cleanText(roundCell.Text())

	// Phase — the full label is in the td without abbreviation
	phaseCell := row.Find("td.stage_value.hide_value")
	phase := cleanText(phaseCell.Text())

	// Season
	season := cleanText(row.Find("td.champ_value").Text())

	// Venue — gym_value cell; strip the nested hotel div
	gymCell := row.Find("td.gym_value")
	gymCell.Find("div").Remove()
	venue := cleanText(gymCell.Text())

	return ScrapedGame{
		Date:      date,
		HomeTeam:  homeTeam,
		AwayTeam:  awayTeam,
		HomeScore: homeScore,
		AwayScore: awayScore,
		Round:     round,
		Phase:     phase,
		Season:    season,
		VenueName: venue,
		Played:    played,
	}, true
}

// parseDateTime parses a date-time string in the format "DD/MM/YYYY HH:MM".
func parseDateTime(s string) (time.Time, error) {
	s = cleanText(s)
	layouts := []string{
		"02/01/2006 15:04",
		"02/01/2006",
	}
	for _, layout := range layouts {
		t, err := time.ParseInLocation(layout, s, brtz)
		if err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("parseDateTime: cannot parse %q", s)
}

// cleanText normalises whitespace in a string extracted from HTML.
func cleanText(s string) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return ' '
		}
		return r
	}, s)
	return strings.TrimSpace(strings.Join(strings.Fields(s), " "))
}
