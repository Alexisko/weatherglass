# Weather Climate App

## Project goal
A single-page weather app to explore the climate of any place over a chosen time window (1 month to 1 year). No backend. Pure HTML/CSS/JS.

## Features
- Location search (city or region name)
- Time range selector (1 month → 1 year)
- Display: sunshine hours, rain day probability, precipitation quantity, daily temperature range (min/max), nighttime temperature

## Architecture
weather-app/
├── index.html
├── style.css
├── app.js
└── components/

## Data source
Open-Meteo Climate API — free, no API key needed.
Docs: https://open-meteo.com/en/docs/climate-api
Open-Meteo Geocoding API for converting user input in coordinates.

## Tech stack
- Vanilla HTML5 / CSS3 / ES6 JS
- Chart.js via CDN for visualizations
- No build tools, no frameworks

## Design direction
Use the frontend-design skill. Go for a clean, data-forward aesthetic — think weather station meets editorial magazine. Prioritize legibility of the climate data over decorative elements.

## Deployment
GitHub Pages (static site, no server)

## Planning docs (read first)
See `docs/`: audit of v1, question catalogue & answer types, methodology (source of truth for every metric), and the phased roadmap. Methodology changes go in `docs/03-methodology.md` before code.
Decisions: light theme default (dark available, both WCAG AA), English only, AI question parsing via a serverless proxy (the AI outputs only a schema-validated query spec; numbers are always computed).
