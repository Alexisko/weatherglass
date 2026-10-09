# Weatherglass

Typical weather for any place on Earth, month by month: daytime highs and night lows, days with rain or snow, and sunshine. All of it comes from 30 years of ERA5 reanalysis data (1991–2020) and is shown with its range, not just an average.

A static site on GitHub Pages: plain HTML, CSS and ES modules, with no build step and no API key.

- **Methodology:** [`methodology.html`](methodology.html) (public) and [`docs/03-methodology.md`](docs/03-methodology.md) (working spec)
- **Roadmap:** [`docs/04-roadmap.md`](docs/04-roadmap.md)

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
npm run check                 # unit tests + WCAG contrast check (Node 20+, no dependencies)
```

Data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0), using ERA5 from the Copernicus Climate Change Service / ECMWF.
