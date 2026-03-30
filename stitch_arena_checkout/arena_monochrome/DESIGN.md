# Design System Document: The Monochromatic Arena

## 1. Overview & Creative North Star: "The Digital Brutalist"
This design system is built to transform the chaotic energy of Brazilian sports and music into a high-end, editorial experience. We reject the "template" look of standard ticket apps. Our North Star is **The Digital Brutalist**: a philosophy where raw content is hero, and structure is defined by weight and contrast rather than lines and boxes.

By utilizing a strictly monochromatic palette, we strip away the noise, allowing the vibrant photography of a packed Maracanã or a sold-out concert to provide the only color in the UI. We use intentional asymmetry—such as oversized display type overlapping subtle tonal containers—to create a sense of motion and "live" energy.

## 2. Colors: Tonal Architecture
In a monochromatic system, color is not a decoration; it is a structural tool. We use a "High-Contrast, Low-Border" approach.

### The "No-Line" Rule
**Standard 1px solid borders are strictly prohibited for sectioning.** To separate a match schedule from a featured concert, use a background shift. For example, a `surface-container-low` section sitting on a `surface` background creates a clear, sophisticated boundary without the visual clutter of a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers.
- **Base Layer:** `surface` (#f9f9f9).
- **Secondary Sectioning:** `surface-container-low` (#f3f3f4).
- **Interactive Cards:** `surface-container-lowest` (#ffffff) to create a subtle "lift."
- **High-Impact Areas:** `primary` (#000000) for headers or call-outs to anchor the eye.

### The Glass & Gradient Rule
To prevent a "flat" feel, use **Glassmorphism** for floating navigation bars or ticket overlays. Use `surface_variant` at 80% opacity with a `20px` backdrop-blur. 
*Signature Polish:* For primary CTAs (like "Buy Tickets"), use a subtle linear gradient from `primary` (#000000) to `primary_container` (#3b3b3b) at a 45-degree angle. This adds "soul" and depth that a flat hex code cannot achieve.

## 3. Typography: Editorial Authority
Our typography scale is designed to feel like a high-fashion sports magazine.

*   **Display & Headlines (Space Grotesk):** This is our "loud" voice. `display-lg` (3.5rem) should be used for event titles or "Sold Out" states. Use tight letter-spacing (-2%) to enhance the "Bold" aesthetic.
*   **Body & Labels (Inter):** This is our "functional" voice. It provides maximum readability for seat numbers, prices, and venue details. 
*   **Hierarchy Tip:** Pair a `display-sm` headline in all-caps with a `body-md` description to create a high-contrast, professional tension.

## 4. Elevation & Depth: Tonal Layering
We do not use traditional "Drop Shadows" which can look "cheap" in a minimalist system. We use **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container-high` background. The change in hex value provides all the "elevation" needed.
*   **Ambient Shadows:** If a floating action button (FAB) or a modal requires a shadow, use a "Cloud Shadow": 
    *   *Blur:* 40px, *Opacity:* 6% of `on_surface`, *Y-Offset:* 12px. It should feel like an ambient glow, not a hard shadow.
*   **The Ghost Border:** If a boundary is required for accessibility (e.g., an input field), use a `1px` border of `outline_variant` at **20% opacity**. Never use 100% opacity for borders.

## 5. Components: Minimalist Primitives

### Buttons
*   **Primary:** `primary` (#000000) background with `on_primary` (#e2e2e2) text. Corner radius: `sm` (0.125rem) for a sharp, aggressive look.
*   **Secondary:** `surface-container-highest` (#e2e2e2) with `on_surface` text.
*   **State:** On hover, primary buttons should transition to `primary_container` (#3b3b3b).

### Cards & Event Lists
**Forbidden:** Divider lines between list items.
**Requirement:** Use vertical whitespace (Spacing Scale `6` or `8`) to separate events. For event cards, use a `surface-container-lowest` background with a `0.25rem` (default) corner radius. Typography inside the card must be the primary driver of the layout.

### Input Fields
*   **Style:** Minimalist underline or "Ghost Border."
*   **Focus State:** The label should animate into a `label-sm` and the "Ghost Border" should increase to 100% opacity of the `primary` token.

### Contextual Components (The "Stadium" Set)
*   **The "Vibe" Chip:** Small, high-contrast chips (`primary` background) to denote "Sold Out," "Fast Selling," or "Finals."
*   **The Seat Map:** Use `surface-dim` for unavailable seats and `primary` for selected seats. Use `surface-container-high` for the stadium outline.

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme scale. Make the price of a ticket `headline-lg` and the "Service Fee" `label-sm`.
*   **Do** use asymmetrical layouts. Let a player's image break the grid and overlap a background container.
*   **Do** utilize the full range of greys to create a "rhythm" as the user scrolls.

### Don't:
*   **Don't** use pure 100% black text on pure 100% white backgrounds for long reading; use `on_surface` (#1a1c1c) for better ocular comfort.
*   **Don't** use rounded corners larger than `0.5rem` (lg). We want the app to feel "sharp" and "precise," not "bubbly."
*   **Don't** add icons for the sake of it. If the text is clear, the icon is unnecessary clutter.

### Accessibility Note:
While we are monochromatic, ensure that all `on_surface` text against `surface` containers maintains a minimum contrast ratio of 4.5:1. Use the `error` (#ba1a1a) token sparingly but clearly for failed transactions or invalid seating selections.