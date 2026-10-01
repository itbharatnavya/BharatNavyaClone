# Bharat Navya design system

The single source of truth for how the frontend looks. **Read this before adding or changing any UI.** If a rule here conflicts with an older note in `CLAUDE.md`, `DESIGN.md`, `HANDOFF.md` or a CSS comment (for example "action orange" or "Directory green"), this file wins.

Code lives in `frontend/app/`: tokens in `counter-direction.css` (`:root`), components and contracts at the end of `counter-soft-system.css`. New work uses the tokens below, never raw hex or one-off pixel values.

## 1. Principles

1. **White surfaces on a light-blue page.** The page is `--canvas`; everything you read or click sits on a white card.
2. **One family of blues plus one warm highlight.** Blues carry structure and state; a single amber highlight is reserved for primary actions (the 10% accent). No other orange, no violet, no green except for success. Colour is never decoration.
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
| `--counter-highlight` | `#ffbe2e` | **the one accent: every primary CTA** (label `--counter-on-highlight` `#12141b`, edge `--counter-highlight-edge`, hover `--counter-highlight-hover`). Amber pops on white and on blue, so primary buttons never need an inverted variant. Use it for nothing else except a rare key highlight |
| `--counter-indigo` | `#1b3fa0` | active tab/pill, selected filter/chip, links, Recruitment surfaces, secondary emphasis |
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

Display: Anek Latin (`--font-anek-latin`). Body and UI: Work Sans (`--font-work-sans`). No other families. **Seven sizes, nothing else** (the migration script that enforced this is described in section 8):

| Token | Size | Use |
|---|---|---|
| `--fs-xs` | `0.75rem` (12px) | labels, captions, chips, badges (the floor; never go smaller) |
| `--fs-sm` | `0.875rem` (14px) | meta text, secondary lines, small buttons, table cells |
| `--fs-md` | `1rem` (16px) | body copy, fields, default buttons |
| `--fs-lg` | `1.125rem` (18px) | card titles, lead text |
| `--fs-xl` | `1.375rem` (22px) | h3, prices, panel titles |
| `--fs-2xl` | `clamp(1.5rem, 2.6vw, 2rem)` | h2, section titles |
| `--fs-3xl` | `clamp(1.9rem, 4vw, 3.25rem)` | h1 and **every hero title** (Home, Directory, Recruitment, Offer, Features, About ...) |

Weights: 400 body, 600 to 700 UI and headings, 800 for price figures. Tailwind's `text-xs/sm/base/lg/xl/2xl/3xl` are configured to these same sizes, so either style is fine.

## 4. Shape and space

- **Radius scale (five steps and a circle):** `--r-xs` `0.5rem` (tiny elements, thumbnails), `--r-sm` `0.75rem` (small tiles, fields), `--r-md` `1rem` (inner tiles, photos inside cards), `--r-lg` `1.25rem` (cards, panels, hero blocks), `--r-pill` `999px` (buttons, chips, segmented controls, search fields), `50%` for circles. Tailwind `rounded-*` is mapped onto the same steps.
- **Borders:** 1px `--counter-line` on cards; no drop shadow on resting cards. A soft shadow (`--counter-shadow-rest`) only for things that float: sticky panels, popovers, the floating header.
- **Spacing:** `--counter-space-1..8` (0.25 to 3rem). Section gap `--counter-section-gap`. Card padding `--counter-space-4` or `-5`.
- **Shell:** `width: min(calc(100% - 2rem), 76rem); margin-inline: auto`. Heroes and sections are inset rounded blocks inside the shell, not edge-to-edge.

## 5. Components (use these, do not re-invent)

- **Primary CTA:** classes `.btn-primary`, `.btn-brand`, `.directory-primary`, `.le-button.is-primary`, `.cp-button`, `.lcard-cta`, search submit buttons, the header "Join / Sign in" and the floating "Post requirement". Filled amber (`--counter-highlight`), dark label, 1px amber edge, pill, `min-height: 2.75rem`; small variant `2.25rem` (`.btn-sm`). One primary per view.
- **Secondary:** `.btn-secondary`, `.le-button`, `.cp-button.is-quiet`. White, 1px strong border, ink label, same size; on a blue surface it is outlined in white with a white label.
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
3. Sizes and radii from the tables (`var(--fs-*)`, `var(--r-*)`). A raw `13px` or `10px` is off-system.
4. Inside the page shell, white card, 1px line, `1.25rem`.
5. CTAs from section 5; one amber primary per view. Never put dark text on a blue surface or blue text on blue: run the contrast check below.
6. Check at 390px and 1440px: no sideways scroll, no clipped corners, no text under 0.75rem.
7. No emoji; icons are inline SVG line glyphs (`stroke="currentColor"`, 1.7 to 2 stroke).

## 7. Deliberate custom designs

These are intentional and are **not** to be normalised without the owner's say-so: the Home hero stage (animated cards), the Directory and Recruitment landing heroes, the status strip, the rotating image ad and the category marquee, the floating header and docked search. Any change that touches how those look needs a conversation first.

## 8. Keeping it consistent

- `frontend/app/counter-direction.css` `:root` defines `--r-*` and `--fs-*`. All older radius names (`--bn-radius-*`, `--counter-*-radius`) now resolve to these.
- A one-off migration mapped every `font-size`, `border-radius`, `fontSize`, `borderRadius` and Tailwind arbitrary value in `frontend/app` and `frontend/components` onto the scale (about 1,400 declarations). Re-run a scan after big changes: distinct font sizes should stay at 7 and distinct radii at 5 plus circle.
- Review new CSS for raw `px`, raw hex colours and `border-radius`/`font-size` that are not tokens before merging.

## 9. Legibility rules (enforced by audit)

- Text on a blue surface is white or `--counter-sky`; text on white or the light-blue page is ink or `--counter-muted` (`--faint` is `#54627a`, 4.5:1 or better on both).
- A label is never the same colour as the surface behind it; selected (blue) states restyle their inner text to white.
- Cards that sit on a hero use a distinct fill and a 1px light border (white, bright blue, navy, pale blue), never the hero's own colour.
- Check with a contrast pass before shipping: every visible text element should reach 4.5:1 against its effective background (`node frontend/scripts/contrast-audit.mjs 1440 / /directory ...`; usage is at the top of the file).
