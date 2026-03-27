# Design System Specification: High-End Editorial SaaS

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Curator"
This design system is not a utility; it is a concierge. It moves away from the cluttered, "dashboard-heavy" aesthetics of traditional SaaS and moves toward the spacious, authoritative feel of high-end editorial layouts. By prioritizing breathing room, tonal depth, and typographic hierarchy, we create an environment of "Quiet Authority."

The system breaks the standard "template" look through **Intentional Asymmetry**. We utilize generous left-aligned headers countered by floating, glass-morphic action cards. We reject the "box-within-a-box" cage, instead allowing content to sit on layered surfaces that feel like fine paper stacked on a polished desk.

---

## 2. Colors & Surface Philosophy

The palette is anchored in deep, sophisticated indigos and cool charcoals, designed to feel premium and trustworthy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or regions. Structural boundaries must be achieved through background color shifts. For example, a `surface-container-low` sidebar against a `background` main stage provides a cleaner, more modern separation than any stroke could.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
- **Base Layer:** `background` (`#f7f9fb`)
- **Content Anchors:** `surface-container-low` (`#f0f4f7`) for large grouping areas.
- **Interactive Cards:** `surface-container-lowest` (`#ffffff`) for primary interaction points.
- **Floating Elements:** Use `surface-bright` with 80% opacity and a 16px backdrop-blur to create a "Frosted Glass" effect for overlays and modals.

### Signature Textures
Avoid flat primary buttons. Use a subtle linear gradient for main CTAs:
- **Primary Action Gradient:** `primary` (`#4955b3`) to `primary_dim` (`#3c49a7`) at a 135-degree angle. This adds "soul" and a tactile quality to the interaction.

---

## 3. Typography: Editorial Authority

We use a dual-typeface system to balance character with readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric modernism and open apertures. Use `display-lg` for welcome states and `headline-md` for page titles. Bold weights should be used sparingly to maintain an elegant, high-end feel.
*   **Body & UI (Inter):** The workhorse. Used for all functional data.
    *   **Title-SM:** Used for card headers to ensure absolute clarity.
    *   **Label-MD:** Use `on-surface-variant` (`#566166`) for labels to create a sophisticated, low-contrast aesthetic that doesn't compete with the data.

---

## 4. Elevation & Depth: Tonal Layering

We convey importance through **Tonal Layering** rather than structural scaffolding.

*   **The Layering Principle:** Depth is achieved by "stacking." A card (`surface-container-lowest`) placed on a section (`surface-container-low`) creates a natural, soft lift.
*   **Ambient Shadows:** When a float is required (e.g., a dropdown), use an ultra-diffused shadow: `0 12px 32px -4px rgba(42, 52, 57, 0.08)`. The shadow color is a tinted version of `on-surface`, never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a container border, use `outline-variant` (`#a9b4b9`) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** For floating "Deal" badges or status indicators, use `surface-tint` at 10% opacity with a heavy backdrop-blur to allow the background context to bleed through beautifully.

---

## 5. Components

### Cards & List Items
*   **Rule:** Forbid divider lines. Use `spacing-6` (2rem) of vertical white space to separate list items.
*   **Styling:** Large `xl` (0.75rem) corner radius. Use `surface-container-lowest` as the fill.
*   **Interaction:** On hover, shift background to `surface-container-high`.

### Input Fields
*   **Architecture:** No bottom borders or heavy boxes. Use `surface-container-lowest` with a "Ghost Border."
*   **Focus State:** Transition the ghost border to `primary` at 100% opacity and add a 2px `primary_container` outer glow.

### Buttons
*   **Primary:** Indigo gradient (see Section 2). `lg` (0.5rem) roundedness.
*   **Secondary:** Ghost style. No fill, `on-primary-fixed-variant` text.
*   **Tertiary:** `surface-container-highest` background with `on-surface` text for low-priority utility actions.

### Chips (Deal Status)
*   **Visuals:** Use `tertiary_container` for the background and `on_tertiary_container` for text. Keep padding generous (`1.5` on X-axis) to maintain the editorial look.

### The "Activity Feed" Component
*   **Unique UI:** Instead of a table, use a vertical "thread" layout with `spacing-4` gaps. Each entry sits on a subtle `surface-container-low` pill-shaped background.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use the Spacing Scale religiously. If an element feels "crowded," double the spacing.
*   **Do** use `on-surface-variant` for secondary information to create a clear visual hierarchy through tonal contrast rather than font size.
*   **Do** use `full` (9999px) roundedness for status chips and avatars to contrast the `xl` (0.75rem) roundedness of containers.

### Don't:
*   **Don't** use 1px solid dividers (e.g., `#DDD`). Use a `background` color shift instead.
*   **Don't** use standard "drop shadows." If it looks like a shadow from 2010, it's too dark and too tight.
*   **Don't** use pure black (`#000`) for text. Always use `on-surface` (`#2a3439`) to maintain the sophisticated charcoal tone.
*   **Don't** center-align long-form content. High-end editorial is almost always left-aligned with strategic asymmetric white space on the right.