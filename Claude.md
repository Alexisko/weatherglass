# Weatherglass

Static climate explorer on GitHub Pages: plain HTML, CSS and ES modules. **No build step, no framework, no runtime dependency** (Google Fonts only). Served from the repo root.

## Read first
- `docs/04-roadmap.md`: decisions, phases, sprint log. `docs/03-methodology.md` is the **source of truth for every metric**: change it *before* changing statistics code, and bump `METHODOLOGY_VERSION` in `js/config.js` and `methodology.html`.
- `docs/01-audit.md` (why v1 was rebuilt) and `docs/02-questions-and-ideas.md` (answer types, question box).

## Decisions
- Light theme by default, dark available. **Both must pass WCAG AA** (`npm run check:contrast`).
- English only.
- Questions in plain English (Phase 3) go through an AI parser behind a serverless proxy. The AI outputs **only** a query spec validated against `schema/query-spec.schema.json`. Numbers are always computed by `js/stats/`, never by a model.
- Data: ERA5 via the Open-Meteo Historical Weather API, normals 1991–2020, local days (`timezone=auto`). Climate-model data is only for future projections (Phase 7).

## Layout
```
index.html, methodology.html
css/tokens.css     colours/type tokens for both themes (checked by scripts/check-contrast.js)
css/main.css       layout and components
js/config.js       methodology constants (reference period, thresholds, percentiles)
js/api/            geocode.js, archive.js (fetch + normalise), cache.js (IndexedDB, best-effort)
js/stats/          pure, unit-tested statistics (no DOM): basic, months, completeness, profile
js/query/spec.js   query spec: validate, normalise, URL <-> spec
js/views/          DOM/SVG rendering: charts (inline SVG), table + CSV, figures, sentence, method notes
js/ui/             search combobox, period control, theme/units prefs
js/main.js         routing (URL is the state) and orchestration
schema/            query-spec JSON Schema (contract for the Phase 3 AI parser)
tests/             node --test; synthetic series in tests/helpers.js
```

## Conventions
- Statistics are pure functions in `js/stats/` with tests. Views never compute statistics.
- Insert API or user strings with `textContent`, never `innerHTML`.
- Charts follow the dataviz rules: one y-axis, thin marks, legend for ≥ 2 series, selective direct labels, and a tooltip that is never the only way to read a value (the table is the accessible twin).
- Every new answer type extends the schema enum, `ANSWER_TYPES` in `js/query/spec.js`, and the tests.

## Commands
```sh
python3 -m http.server 8000   # run locally
npm test                      # unit tests (Node 20+, no install needed)
npm run check                 # tests + contrast check (what CI runs)
```
