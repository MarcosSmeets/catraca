package nbb

import (
	"context"
	"fmt"
	"time"

	"github.com/chromedp/chromedp"
)

const (
	lnbURL        = "https://lnb.com.br/nbb/tabela-de-jogos"
	tableSelector = "table"
	rowSelector   = "table tbody tr"
)

// Scraper fetches the NBB game schedule from lnb.com.br using a headless browser.
type Scraper struct{}

// NewScraper creates a new Scraper instance.
func NewScraper() *Scraper {
	return &Scraper{}
}

// Fetch navigates to the LNB schedule page, waits for the games table to render,
// and returns the raw outer HTML of the table for further parsing.
func (s *Scraper) Fetch(ctx context.Context) (string, error) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.ExecPath("/usr/bin/chromium-browser"),
		chromedp.Flag("headless", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"),
	)

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, opts...)
	defer cancelAlloc()

	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)
	defer cancelBrowser()

	// Overall timeout for the full scrape operation.
	timeoutCtx, cancelTimeout := context.WithTimeout(browserCtx, 120*time.Second)
	defer cancelTimeout()

	var tableHTML string

	err := chromedp.Run(timeoutCtx,
		// Navigate to the schedule page.
		chromedp.Navigate(lnbURL),

		// Wait until the games table rows are visible in the DOM.
		// The LNB site is a JS SPA; the table renders asynchronously.
		chromedp.WaitVisible(rowSelector, chromedp.ByQueryAll),

		// Give an extra moment for all rows to finish loading.
		chromedp.Sleep(2*time.Second),

		// Extract the full outer HTML of the table.
		chromedp.OuterHTML(tableSelector, &tableHTML, chromedp.ByQuery),
	)
	if err != nil {
		return "", fmt.Errorf("nbb.Scraper.Fetch: %w", err)
	}

	if tableHTML == "" {
		return "", fmt.Errorf("nbb.Scraper.Fetch: empty table HTML; page may have changed structure")
	}

	return tableHTML, nil
}
