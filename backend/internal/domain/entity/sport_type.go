package entity

type SportType string

const (
	SportFootball   SportType = "FOOTBALL"
	SportBasketball SportType = "BASKETBALL"
	SportVolleyball SportType = "VOLLEYBALL"
	SportFutsal     SportType = "FUTSAL"
	SportAthletics  SportType = "ATHLETICS"
)

var validSportTypes = map[SportType]bool{
	SportFootball:   true,
	SportBasketball: true,
	SportVolleyball: true,
	SportFutsal:     true,
	SportAthletics:  true,
}

func (s SportType) IsValid() bool {
	return validSportTypes[s]
}

func (s SportType) String() string {
	return string(s)
}
