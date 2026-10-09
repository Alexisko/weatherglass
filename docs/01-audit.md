# 01 — Audit of the existing site

Snapshot audited: commit `6c4e37c` (single "Initial commit"). Three files: `index.html` (≈7 KB), `style.css` (≈18 KB), `app.js` (≈21 KB). It's a static site with no build step, deployed on GitHub Pages.

## 1. What the site does today

```
Search box ─► pick a geocoding suggestion ─► "location card" appears ─► click "Explore Climate"
   ─► fetch 10 years of daily data (2013–2022) from the Open-Meteo *Climate* API, model EC_Earth3P_HR
   ─► period picker (Annual / Q1–Q4 / Jan–Dec), filtered client-side
   ─► 5 KPI tiles + 3 charts (synthetic "average day", monthly precipitation, cloud + humidity)
```

### Worth keeping

| Keep | Why |
|---|---|
| No backend, no API key, static hosting | Cheap and durable, and it suits GitHub Pages. The new features below are designed to stay inside this constraint. |
| Open-Meteo as the data provider | Free, CORS-enabled, and covers geocoding, reanalysis, forecast and projections. The site just calls the **wrong endpoint** (see §2). |
| Geocoding autocomplete with debounce and keyboard navigation | Works and is accessible (`role=listbox`, `aria-selected`). |
| Fetch once, filter client-side | The right pattern. It extends naturally to the 30-year series. |
| HTML escaping of API strings | Correct. |

## 2. Methodology problems (most serious first)

These problems make the current numbers **unreliable or misleading**. They matter more than the visual issues.

| # | Problem | Where | Why it matters | Fix |
|---|---|---|---|---|
| M1 | **The data is a climate-model simulation, not observed weather.** `EC_Earth3P_HR` is one free-running CMIP6 HighResMIP model. Its "2013–2022" is a statistically plausible decade under historical forcing. It is not what actually happened. | `app.js:213-215` | Every number on the page is one model's opinion, with that model's biases (often several °C and tens of % in precipitation locally). Users read it as "the climate of Paris". | Use **ERA5 / ERA5-Land reanalysis** (Open-Meteo Historical Weather API) for everything about the past and present. Keep the Climate API **only for future projections**, as a multi-model ensemble with bias correction. |
| M2 | **10 years is not a climate normal.** | `app.js:213`, `/ 10` at `:281`, `:327` | WMO defines a climate normal over **30 years**; the current reference is **1991–2020**. Ten years is dominated by interannual noise. The `/ 10` is also hard-coded and breaks if a year is missing. | Use 1991–2020 as the reference, count the years actually present, and show `n` years on every statistic. |
| M3 | **The "Average Day Profile" chart is made up.** It draws a sine wave between mean Tmin and Tmax, with the minimum at 02:00 and the maximum at 14:00, and labels it "°C · per hour". | `app.js:357`, `:430`, `:564-569` | It shows invented data as if it were measured. The real minimum is near sunrise, which moves with season and latitude. | Delete it. If a diurnal chart is wanted, build it from real **hourly** ERA5 (averaged by hour for the period), clearly labelled. |
| M4 | **The wet-day threshold is > 0 mm.** | `app.js:282` | Reanalyses and models produce "drizzle" (0.01 mm) almost every day, so "rain day probability" is badly inflated. The convention (WMO / ETCCDI `R1mm`) is **≥ 1.0 mm**. | Wet day = precipitation ≥ 1.0 mm. Optionally add ≥ 10 mm "heavy rain days". |
| M5 | **Days are aggregated in UTC.** | `app.js:224` | In Sydney, Los Angeles or Tokyo, "daily max/min" mixes two local days, which biases Tmin/Tmax and daily rain totals. | `timezone=auto`, so days follow local time. |
| M6 | **Cloud cover stands in for sunshine.** The brief asks for *sunshine hours*. | `app.js:220`, `:330-334` | Cloud cover ≠ sunshine: thin cirrus is "cloudy" but sunny. Users ask "how many hours of sun?" | Use `sunshine_duration` (hours per day) and `daylight_duration` from the Historical API. |
| M7 | **Only means are shown, with no spread.** | KPIs, charts | "Average high 24 °C" hides whether a given day might be 16 °C or 33 °C. That spread is what people plan around. | Show P10–P90 ranges (or min–max of the 30 years) next to every mean. |
| M8 | **No provenance or caveats.** | Banner `:306` | The page never says what a grid cell is, what elevation it sits at, or that values are not station records. | Add a "How this is computed" disclosure per card and a Methodology page (see `03-methodology.md`). |
| M9 | **The brief's "nighttime temperature" isn't delivered**, and "low" is buried as a sub-label. | `:312-316` | Tmin is the night temperature. It deserves equal weight with Tmax. | Show high and low together as a band. |

## 3. Legibility and visual design

The theme ("weather station meets editorial magazine") has character. The execution works against reading the data.

**Measured contrast** (WCAG 2.x; AA requires 4.5:1 for normal text):

| Token | Colour | On card `#131824` | Verdict | Used for |
|---|---|---|---|---|
| `--text-muted` | `#484038` | **1.75 : 1** | ❌ fails badly | KPI labels, chart titles, axis ticks, coordinates, sub-labels, footer, placeholder (15 uses) |
| `--text-secondary` | `#8a8272` | 4.66 : 1 | ⚠️ barely passes | KPI units, legends, italic hero line |
| `--text-primary` | `#e2dbd0` | 12.9 : 1 | ✅ | |
| `--accent` | `#c9a84c` | 7.76 : 1 | ✅ | |

**Typography**

- 15 rules use 0.58–0.68 rem (**9–11 px**), mostly in uppercase monospace with 0.18–0.28 em letter-spacing. That is the hardest combination to read, and it carries the important labels.
- Chart ticks are 10 px in `#484038`, so they're effectively invisible.
- KPI numbers use *Cormorant Garamond* at weight 300–400: thin, high-contrast serif digits without tabular figures. They look elegant but are hard to scan and compare.
- Three font families (display serif, mono, sans) compete. Mono is used for prose.

**Layout and atmosphere**

- Three animated, blurred radial gradients (`filter: blur(90px)`) plus an SVG grain layer run on every frame. They cost GPU and battery and add nothing to reading.
- The hero takes the whole first screen. Once results load, the search block stays above them, so the user scrolls past a giant title to reach their data.
- No light theme, no °C/°F or mm/in toggle, and no shareable URL.

## 4. Duplicated elements

| What | Appears in | Proposal |
|---|---|---|
| **Place name** | (1) search input value, (2) location card (large serif), (3) results banner (large serif) | Show it once, as the dashboard title. The search box becomes a compact header control. |
| **Coordinates** | Location card (3 decimals, `app.js:140`) **and** banner (2 decimals, `app.js:294`), from two copies of the same formatting code | Show them once, in the provenance line, through a single `formatCoords()`. |
| **Product name** | `<title>` "Climate Explorer", header "Weatherglass", header tagline "Climate · Explorer", hero "Climate in detail", eyebrow "Where do you want to explore?" | One brand mark and one prompt. |
| **Selected period** | Active button state **and** banner label | Keep it on the control. Drop it from the banner. |
| **Period controls** | 17 buttons on 3 rows: Annual, 4 quarters, 12 months. Quarters are just groups of months. | One 12-month strip with range selection (click-drag or shift-click), plus "Year" and season presets. |
| **Location card + Explore button** | An extra confirmation step after a suggestion was already chosen | Picking a suggestion loads the dashboard directly. |
| **Cloud cover** | KPI tile and chart | Replace both with sunshine hours, shown once. |
| **Two identical 0–100 % y-axes** on the cloud/humidity chart | `app.js:468+` | Split it, or drop humidity in favour of dew point (which people feel). |
| **Temperature chart legend** | 12 series coloured by temperature, so neighbouring months look the same | Replace with a single monthly band chart. |
| **Footer** | "No API key required · Free & open source" is developer-facing | Replace with the data attribution and a link to the Methodology page. |
| **Theme colours** | Hard-coded again in JS for Chart.js (`#1a2030`, `#c9a84c`…) | Read CSS custom properties at runtime. |

## 5. Engineering issues

- **Uncaught errors on period change.** `renderResults()` throws (`:254`, `:261`), but on period change it is called outside any `try` (`:170`). Errors vanish silently and the UI is left half-rendered.
- **Chart instances are never destroyed.** Each re-render does `innerHTML = …` and `new Chart(...)`, so the old instances keep their resize listeners. Keep references and call `.destroy()`, or `.update()` the existing charts.
- **One 600-line script with global state**, mixing DOM, fetching, statistics and chart config. None of the statistics can be unit-tested.
- **No URL state**: you can't share or bookmark a result, and the back button doesn't work.
- **No caching**: every "Explore" re-downloads the series.
- Dead code: `.time-picker__desc` in the CSS is unused. `Claude.md` describes a `components/` folder that doesn't exist.
- No tests, no CI, no accessibility check, no deploy workflow.

## 6. Gap against the original brief (`Claude.md`)

| Brief | Status |
|---|---|
| Location search | ✅ |
| Time window, 1 month → 1 year | ⚠️ Fixed calendar buckets only. No arbitrary window. |
| Sunshine hours | ❌ Cloud cover instead |
| Rain-day probability | ⚠️ Wrong threshold (> 0 mm) |
| Precipitation quantity | ⚠️ From one model, not observations |
| Daily temperature range (min/max) | ⚠️ Means only, plus a fabricated hourly curve |
| Nighttime temperature | ⚠️ Shown only as a sub-label |
| "Prioritise legibility of the climate data over decorative elements" | ❌ The opposite was delivered (see §3) |

**Bottom line:** the shell (search, fetch-once, static hosting) is reusable. The data source, the statistics and the visual layer need to be redone, and the methodology problems should be fixed **before** any new feature is added.
