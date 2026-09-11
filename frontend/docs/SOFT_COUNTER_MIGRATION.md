# Soft Counter migration

The approved direction keeps Counter's typography and colour identity while reducing visual load through inset canvases, consistent radii, quieter borders, and deliberate breathing room. Product behaviour, routes, data, authentication, and API contracts stay unchanged.

## Design contract

- Major coloured sections: `--counter-section-radius` (30px desktop)
- Cards and grouped content: `--counter-card-radius` (22px desktop)
- Inputs, buttons, and icon controls: `--counter-button-radius` (15px desktop)
- Pills: reserved for filters, tags, and compact examples only
- Page gutters: responsive `--counter-page-gutter`
- Separation: warm hairlines plus restrained rest/lift shadows
- Motion: one shared 220ms ease; reduced-motion preferences remain respected

The source of truth is `app/counter-soft-system.css`, loaded after the existing route styles. Page styles continue to own layout; the system file owns shared shape, spacing, elevation, and interactive surfaces.

## Phases

1. **Foundation and Home** — complete in `55405d2`: shared tokens, header/footer, controls, Home hero, gateways, standard, comparison, journey, and editorial cards.
2. **Directory and Recruitment** — complete: landing pages, results, filters, cards, status rails, company/employer profiles, and job/listing details.
3. **Access and creation** — complete: login, registration, profile, shortlist, sell/add-product, and post-job flows.
4. **Operational workspaces** — Directory dashboard, Recruitment dashboard, admin, tables, dialogs, and empty/loading/error states.
5. **Release audit** — desktop/mobile route sweep, keyboard/focus, reduced motion, contrast, overflow, build, and design-system validation.

Each phase should be independently reviewable and committed on `design`. No phase should change backend behaviour to make a visual state appear successful.
