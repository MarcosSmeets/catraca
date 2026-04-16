package entity

type ResaleListingStatus string

const (
	ResaleListingStatusActive    ResaleListingStatus = "active"
	ResaleListingStatusCancelled ResaleListingStatus = "cancelled"
	ResaleListingStatusSold      ResaleListingStatus = "sold"
)
