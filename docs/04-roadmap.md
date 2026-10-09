# 04 — Roadmap

Built from the audit (`01`), the answer types (`02`) and the methodology (`03`). The ordering rule: **correct numbers first, then legibility, then more questions.** Each phase ships something usable on GitHub Pages.

```
Phase 0  Foundations & correct data          ─┐
Phase 1  Redesign + "Profile" answer          ├─ the "rebuild" (makes today's feature trustworthy and readable)
Phase 2  "Today vs normal" (Anomaly)          ─┘
Phase 3  Compare places
Phase 4  Climate evolution (Trend, Extremes)
Phase 5  The question box (guided → rules → optional LLM)
Phase 6  Find / Best time / Twin (precomputed city table)
Phase 7  Projections 2021–2050 + climate analogues
```

Sizes are relative effort: S ≈ a few days, M ≈ 1–2 weeks, L ≈ 3+ weeks for one developer.

---

## Phase 0: Foundations and correct data (M)

**Goal:** the numbers are right and testable before anything is redesigned.

Methodology
- [ ] Switch the data source from the Climate API (`EC_Earth3P_HR`, 2013–2022) to the **Historical Weather API (ERA5 / ERA5-Land), 1991–2020** (`03` §2).
- [ ] `timezone=auto` (local days).
- [ ] Wet day ≥ 1.0 mm. Count the years actually present instead of `/ 10`.
- [ ] Replace cloud cover with `sunshine_duration` and `daylight_duration`.
- [ ] **Delete** the synthetic "Average Day Profile" chart.
- [ ] Add P10–P90 to every monthly statistic.

Engineering
- [ ] Split `app.js` into ES modules (no build step, `<script type="module">`):
  `api/` (geocode, archive, forecast, climate + IndexedDB cache) · `stats/` (pure functions) · `query/` (query spec, URL ⇄ spec) · `views/` (cards, charts) · `ui/` (search, controls).
- [ ] `stats/` unit tests with `node --test` + golden fixtures (`03` §5).
- [ ] URL state (`?place=…&months=5-6`), so results are shareable and the back button works.
- [ ] Error handling around every render. Destroy and update Chart.js instances.
- [ ] GitHub Actions: tests on PR, then deploy to Pages. Add an accessibility check (axe or Lighthouse CI).
- [ ] Update `Claude.md` to match the new architecture and point to `docs/`.

**Done when:** for Paris, London and New York, the 1991–2020 monthly Tmax/Tmin and wet-day counts are within the `03` §5 targets of the official normals, and the test suite is green in CI.

---

## Phase 1: Redesign and the "Profile" answer (M–L)

**Goal:** fix legibility and duplication, and lay down the design system every later answer type will reuse.

Design direction: keep the "weather station meets editorial magazine" spirit, but **data first**:
- **Light theme by default, dark theme as an option** (both built from tokens), each with AA contrast checked in CI. No text token below 4.5:1. The current `--text-muted` (1.75:1) is removed.
- **Type:** one sans family for the UI and the data (e.g. IBM Plex Sans or Inter) with **tabular figures**. The serif is kept for the page title only. No mono for prose. Minimum 14 px for body text and 12 px for labels. Sentence-case labels instead of letter-spaced uppercase.
- **No animated atmosphere layers or grain.** Character comes from typography, a restrained palette and good charts.
- **A colour system for data:** one diverging scale for temperature anomalies (blue ↔ red, colour-blind-safe), one sequential blue for precipitation, one amber for sunshine. Used the same way on every chart.

Information architecture (removes the duplications listed in `01` §4):
- A compact **header with the search/question box**, always visible. Picking a place loads the dashboard directly (no location card, no Explore button).
- The **place name appears once**, as the dashboard title, with one provenance line (coordinates, grid-cell elevation, dataset, period).
- **One period control:** a 12-month strip with range selection, plus Year and season presets. It replaces the 17 buttons.
- An **answer page layout** shared by all answer types (`02` §3.2): answer sentence → 2–4 key figures with ranges → hero chart → "How this was computed" → follow-up chips → CSV download.

Profile answer content:
- Hero: a **monthly climate chart** with a high/low band and P10–P90 whiskers, and bars for wet days and sunshine hours.
- Key figures: typical high / low, wet days, rain total, sunshine hours per day, daylight.
- °C/°F and mm/in toggle. EN/FR strings in a single dictionary.
- **Methodology page** (public version of `03`) linked from every card and from the footer.

**Done when:** a Lighthouse accessibility score ≥ 95, every text style passes AA, the layout works at 360 px width, and five test users can answer "How many rainy days in Lisbon in May?" in under 15 seconds.

---

## Phase 2: "Today vs normal", the Anomaly answer (M)

**Goal:** answer the most-asked question, "is this normal?"

- [ ] Forecast API with `past_days=92&forecast_days=7`, stitched to ERA5 and flagged as preliminary (`03` §2).
- [ ] Day-of-year climatology (±7-day window, 1991–2020), giving anomaly, percentile and plain-language rarity (`03` §3.2).
- [ ] Hero: **"where today sits"** percentile strip for high, low and rain. Secondary: the last 90 days and the next 7 drawn over the normal band.
- [ ] Month/season-to-date anomaly ("October so far: +1.8 °C, 40 % of normal rain").
- [ ] "When was it last this warm on this date?", from the ERA5 series back to 1940.
- [ ] Past dates: the same answer for any day ("on this day", "the day I was born").

**Done when:** the answer sentence, the numbers and the chart agree, as checked by golden tests on recorded responses.

---

## Phase 3: Compare places (M)

- [ ] 2–4 places on one page: add or remove place chips, URL `?q=compare&places=paris,lyon`.
- [ ] Same basis for every place (`03` §3.7). Small-multiple charts with **shared axes**.
- [ ] A difference table and one sentence per metric ("Lyon gets 31 more hours of sun in July and 2.4 °C warmer afternoons").
- [ ] "Today in A vs today in B" by reusing Phase 2.
- [ ] Köppen–Geiger badge per place.

---

## Phase 4: Climate evolution (Trend and Extremes) (M–L)

- [ ] Full ERA5 / ERA5-Land daily series from 1950, cached.
- [ ] Trend card: annual or seasonal series, Theil–Sen slope per decade with a 95 % CI, Mann–Kendall wording, and the pre-1979 segment shaded (`03` §3.6).
- [ ] **Warming stripes** for any place and season.
- [ ] Threshold days through time: hot days, tropical nights, frost days, wet days, heavy-rain days, longest dry spell.
- [ ] "Then vs now": 1961–1990 vs the last 10 years.
- [ ] "Since you were born": enter a year.
- [ ] Extremes: records in the dataset with dates, and exceedance counts for a user threshold. Return levels (GEV) only after validation.

---

## Phase 5: The question box (L, in three steps)

The text field fills in a **query spec**, and the engine computes the answer (`02` §3.1). It lands after Phases 2–4 so that it has answer types to route to.

1. **5a, guided questions (S):** sentence templates with editable blanks, shown under the box and on the empty home page. The home page then doubles as the "what can I ask?" menu.
2. **5b, rule-based parser, EN + FR (M):** intents (anomaly, profile, compare, trend, extremes, best-time), places through the geocoder, dates and periods, comparison words, metrics. The parse is always shown as editable chips. Tests: a corpus of 200+ real phrasings with their expected spec, with parser accuracy tracked in CI.
3. **5c, optional LLM fallback (M):** a serverless proxy (Cloudflare Worker or similar; the API key can't live on GitHub Pages) that returns **only** a query spec, validated against the JSON schema. Rate-limited and cached, with the rule-based parser as fallback. The model never produces the numbers.

**Done when:** at least 85 % of the test corpus is parsed correctly by 5b alone, and every answer can be corrected through the chips in one click.

---

## Phase 6: Find, Best time and Climate twin (M–L)

- [ ] A **scheduled GitHub Action** (monthly) computes 1991–2020 normals for about 500–1,000 cities (capitals, cities with more than 300k inhabitants, major tourist destinations) and commits `data/cities-normals.json`. It respects Open-Meteo's free-tier limits and stays fast for users.
- [ ] **Find:** constraint filters (months, temperature range, max wet days, min sunshine, region) give a ranked list and a map.
- [ ] **Best time to visit:** a 12-month suitability strip for a place and the user's preferences.
- [ ] **Event-date probability:** a date and place give the chance of a wet day, of > 30 °C, and the typical range (±7-day window).
- [ ] **Climate twin:** the nearest climates by standardised distance (`03` §3.7).

---

## Phase 7: Projections and climate analogues (M)

- [ ] All 7 CMIP6 HighResMIP models from the Climate API. Delta method against ERA5 normals. Median and model range (`03` §3.8).
- [ ] "Mid-century (2021–2050) vs 1991–2020" band chart, plus the change in hot days, tropical nights and frost days.
- [ ] **"Which city today has my city's future climate?"**, using the Phase 6 table.
- [ ] Clear scenario labelling (high emissions) and a "projection ≠ forecast" note.

---

## Cross-cutting, every phase

| Topic | Practice |
|---|---|
| Methodology | Every new metric is added to `03-methodology.md` **before** it's coded, with its source. The version is bumped and shown on the site. |
| Testing | Unit tests for `stats/`, golden fixtures for API responses, and the benchmark table re-run when data logic changes. |
| Accessibility | AA contrast, keyboard navigation, chart data available as a table or CSV, `prefers-reduced-motion` respected. |
| Performance | One request per place per dataset, IndexedDB cache, Chart.js as the only dependency (pinned version), no web fonts beyond 2 families. |
| Data etiquette | Open-Meteo attribution (CC BY 4.0) and ECMWF/Copernicus credit in the footer and on the Methodology page. Stay within the free non-commercial terms, or move to an API plan if the site grows. |
| i18n | EN and FR strings from day one (single dictionary). |

## Suggested first sprint (the next concrete step)

1. Phase 0 data switch and `stats/` module with tests: the "trustworthy numbers" milestone.
2. Design tokens (light and dark, AA-checked) and the new page skeleton without duplications.
3. Profile answer on the new skeleton, plus the Methodology page v1.

That alone replaces the current site with one that is correct, readable and shareable. Every later phase adds an answer type to the same skeleton.

## Decisions needed from you

1. **Default theme:** light-first (recommended for legibility) or keep dark-first?
2. **Languages:** EN + FR from Phase 1 (recommended), or EN only at first?
3. **LLM fallback (5c):** OK to add a small serverless proxy with an API key (a cost and an extra service), or stay 100 % static with templates and rules only?
4. **City table size and coverage** for Find/Twin: Europe-first or global?
