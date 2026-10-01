# Bharat Navya design system

The single source of truth for how the frontend looks. **Read this before adding or changing any UI.** If a rule here conflicts with an older note in `CLAUDE.md`, `DESIGN.md`, `HANDOFF.md` or a CSS comment (for example "action orange" or "Directory green"), this file wins.

Code lives in `frontend/app/`: tokens in `counter-direction.css` (`:root`), components and contracts at the end of `counter-soft-system.css`. New work uses the tokens below, never raw hex or one-off pixel values.

## 1. Principles

1. **White surfaces on a light-blue page.** The page is `--canvas`; everything you read or click sits on a white card.
2. **One family of blues, each with a job.** No orange, no violet, no green except for success. Colour is never decoration.
3. **One CTA look.** Every primary action on the platform is the same shape, size and colour.
4. **Rounded, contained, aligned.** Everything sits inside the page shell; no full-bleed bands, no sharp-edged panels.
5. **Text never sits on a photo** except a short label chip. Facts, prices and actions live on solid surfaces.
6. **Data is real or absent.** Show API data, or a skeleton or an honest empty state; never invented content.

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#dce9fb` | page background (do not change) |
| `--counter-ivory` | `#ffffff` | card / panel / field surface |
| `--counter-line` | `#b9cce6` | 1px borders on cards |
| `--counter-line-strong` | derived | borders on fields, chips, secondary buttons |
| `--counter-indigo` | `#1b3fa0` | **primary action**: every CTA, active tab/pill, selected filter, links, Recruitment surfaces |
| `--counter-indigo-hover` | `#12307e` | hover/pressed for the above |
| `--counter-green` | `#2556c8` | Directory surfaces (heroes, route cards). Name is legacy; it is blue |
| `--counter-indigo-soft` | `#dbe4fb` | chips, icon tiles, selected-row tints |
| `--counter-sky` | `#9db8ff` | accent text on blue surfaces |
| `--counter-focus` | `#3b6cf5` | focus rings, stars, chart lines |
| `--counter-ink` / `--counter-muted` | `#12141b` / `#565c69` | text / secondary text |
| `--counter-success` | `#16834f` | success and verified ticks only |
| `--counter-error` | `#b42318` | errors only |

`--counter-saffron` and `--action` are legacy names that now resolve to the primary blue. Do not use them in new code; use `--counter-indigo`.

## 3. Type

Display: Anek Latin (`--font-anek-latin`). Body and UI: Work Sans (`--font-work-sans`). No other families.

| Role | Size | Weight |
|---|---|---|
| Page title (h1) | `clamp(1.75rem, 3.2vw, 2.5rem)` (heroes up to 3.5rem) | 700 |
| Section title (h2) | `clamp(1.35rem, 2.4vw, 1.9rem)` | 700 |
| Card title / h3 | `1.05rem` | 700 |
| Body | `1rem` | 400 to 500 |
| UI text (buttons, fields, rows) | `0.95rem` | 600 to 700 |
| Meta / secondary | `0.85rem` | 400 to 600 |
| Label / caption / chip | `0.75rem` | 700, uppercase labels `letter-spacing: .07em` |

Never go below `0.75rem` for text a person has to read. Price numbers: Anek Latin 800.

## 4. Shape and space

- **Radius:** pill `999px` for buttons, chips, segmented controls and search fields; card `1.25rem` (`--counter-radius-card`); inner tile `1rem`; small `0.75rem`; circle `50%`. Nothing else.
- **Borders:** 1px `--counter-line` on cards; no drop shadow on resting cards. A soft shadow (`--counter-shadow-rest`) only for things that float: sticky panels, popovers, the floating header.
- **Spacing:** `--counter-space-1..8` (0.25 to 3rem). Section gap `--counter-section-gap`. Card padding `--counter-space-4` or `-5`.
- **Shell:** `width: min(calc(100% - 2rem), 76rem); margin-inline: auto`. Heroes and sections are inset rounded blocks inside the shell, not edge-to-edge.

## 5. Components (use these, do not re-invent)

- **Primary CTA:** classes `.btn-primary`, `.btn-brand`, `.directory-primary`, `.le-button.is-primary`, `.cp-button`, `.lcard-cta`. Filled `--counter-indigo`, white label, pill, `min-height: 2.75rem`; small variant `2.25rem` (`.btn-sm`). On a blue surface it inverts to white fill with a blue label (already handled for heroes, closing bands, support pages).
- **Secondary:** `.btn-secondary`, `.le-button`, `.cp-button.is-quiet`. White, 1px strong border, ink label, same size.
- **Icon buttons:** round, `2.25 to 2.75rem`, white with a border (info, save, close). **Close is always an icon-only round white button**, never the word "Close".
- **Cards:** white, 1px line, `1.25rem`, photo or content on top, facts and actions below. Listing cards are `ListingCard` (`.lcard`); do not make a second listing card.
- **Chips and badges:** pill, `0.75rem`; blue-soft fill with blue text; neutral grey for plain facts; dark ink only for "Sponsored".
- **Fields:** white, 1px strong border, pill or `0.75rem`, `2.75rem` high, blue focus ring.
- **Dropdowns:** write a normal `<select>`. `DropdownEnhancer` (mounted in the root layout) replaces the browser popup with the themed list for every select, with a filter box above 10 options. Add `data-native` only to opt out.
- **Filters:** `Filters` (Directory) and `JobFilters` (Recruitment) share the `.flt*` pieces: applied chips and Clear all on top, segmented control for type, switches for yes/no, option lists with counts, price chips plus a max field. Panel is a white card; on small screens it becomes a bottom sheet.
- **Results pages:** blue hero, then a white results panel with a list/grid toggle and the filter panel; the sponsored slot goes below the results, not above.
- **Floating chrome:** header is a floating white bar; assistant bubble bottom-right on every page except sign-in and admin; "Post requirement" pill above it on Directory pages.

## 6. Adding something new: the checklist

1. Find the closest existing component above and reuse it. Only build new if none fits, and then compose it from the tokens here.
2. Colours from section 2 only. If you reach for a hex code, you are off-system.
3. Sizes from the type and radius tables. If you reach for `13px` or `14px`, use `0.85rem`.
4. Inside the page shell, white card, 1px line, `1.25rem`.
5. CTAs from section 5; one primary per view.
6. Check at 390px and 1440px: no sideways scroll, no clipped corners, no text under 0.75rem.
7. No emoji; icons are inline SVG line glyphs (`stroke="currentColor"`, 1.7 to 2 stroke).

## 7. Deliberate custom designs

These are intentional and are **not** to be normalised without the owner's say-so: the Home hero stage (animated cards), the Directory and Recruitment landing heroes, the status strip, the rotating image ad and the category marquee, the floating header and docked search. Any change that touches how those look needs a conversation first.
