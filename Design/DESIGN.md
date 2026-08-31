# BharatConnect Design System

> Historical visual summary. The current governed Bharat Navya source of truth is
> `docs/DESIGN_SYSTEM.md`, implemented in `src/design-system/` and demonstrated at
> `/design-system`. Preserve this file for context; do not add new component rules here.

## Direction

A soft editorial business index combined with optional guided refinement. The UI is light, friendly, and evidence-led, with rounded independent surfaces, open whitespace, and cobalt reserved for current state and primary action.

## Scene

A founder moves between a bright shared office and a phone on the way to a meeting, trying to make a credible vendor decision quickly without losing important evidence.

## Color

- Canvas: `#f7f8fb`
- Surface: `#ffffff`
- Soft surface: `#f0f4fa`
- Ink: `#171a22`
- Muted ink: `#626a79`
- Rule: `#dfe4ec`
- Primary cobalt: `#275bd6`
- Primary dark: `#1f4dbd`
- Verified mint: `#e3f6ec` with `#12613e` text
- Uncertainty amber: `#fff3d6` with `#805400` text

## Typography

One bundled product family: Manrope Variable, followed by system sans. Headings use compact tracking; interface copy stays calm and compact; data uses tabular numerals where alignment matters.

## Layout

A 4px spacing base. Mobile uses a single-column evidence list and one bottom navigation per mode. At 1024px, results use a list plus selected-business preview. Wide desktop adds decision context as a third column. Founders use one global header with no sidebar. Providers use a 240px collapsible local sidebar with a 72px icon rail. Cards are reserved for independent selections; rows, whitespace, and restrained boundaries carry related grouping.

## Components

Buttons, inputs, chips, trust marks, evidence rows, index rows, step progress, dialogs, empty states, and status notices share one interaction vocabulary. Radius tiers are 10–12px for compact controls, 14–16px for fields and chips, and 20–24px for major surfaces. All controls define hover, focus, active, disabled, loading, error, and success states.

## Motion

100–150ms press feedback and 180–240ms state transitions using strong ease-out curves. No page-load choreography. Reduced motion replaces movement with immediate state changes.
