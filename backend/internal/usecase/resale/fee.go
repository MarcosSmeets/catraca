package resale

// ApplicationFeeCents returns the platform fee for a resale (5%, minimum R$0,50, strictly less than price).
func ApplicationFeeCents(priceCents int64) int64 {
	if priceCents <= 0 {
		return 0
	}
	fee := priceCents * 5 / 100
	if fee < 50 {
		fee = 50
	}
	if fee >= priceCents {
		fee = priceCents / 2
		if fee < 1 {
			fee = 1
		}
	}
	return fee
}
