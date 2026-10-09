# 04 — Roadmap

Built from the audit (`01`), the answer types (`02`) and the methodology (`03`). The ordering rule: **correct numbers first, then legibility, then more questions.** Each phase ships something usable on GitHub Pages.

```
Phase 0  Foundations & correct data          ─┐
Phase 1  Redesign + "Profile" answer          ├─ the "rebuild" (makes today's feature trustworthy and readable)
Phase 2  "Today vs normal" (Anomaly)          ─┘
Phase 3  The question box (AI-powered, via a serverless proxy)
Phase 4  Compare places
Phase 5  Climate evolution (Trend, Extremes)
Phase 6  Find / Best time / Twin (precomputed city table)
Phase 7  Projections 2021–2050 + climate analogues
```

The question box comes right after the first two answer types exist. From then on, each new answer type also extends the question box's query schema, so users can ask about it in their own words as soon as it ships.

Sizes are relative effort: S ≈ a few days, M ≈ 1–2 weeks, L ≈ 3+ weeks for one developer.

## Decisions taken

| # | Decision | Effect on the plan |
|---|---|---|
| 1 | **Light theme by default**, dark theme available, and both must be readable | Phase 1: two token sets, with AA contrast checked in CI for both |
| 2 | **English only** | No translation layer. The AI parser still understands questions typed in other languages, but answers are in English. |
| 3 | **Serverless proxy accepted. AI is the primary way to understand questions.** | Phase 3 is built around the AI parser. Rule-based parsing shrinks to a minimal fallback. |
| 4 | City table coverage: **global, starting with about 500 cities** | Only affects Phase 6. Check the API quota cost first (see Phase 6). |

---

## Phase 0: Foundations and correct data (M), sprint 1 done

**Goal:** the numbers are right and testable before anything is redesigned.

Still open from Phase 0:
- **Golden fixtures** recorded from the real API (the sprint ran without network access to Open-Meteo, so tests use synthetic series).
- The **benchmark against official normals** (`03` §5), which is also the "done when" check below.
- Confirm the live API returns every requested variable for `models=era5` (`03` §2 *verify*).

Methodology
- [x] Switch the data source from the Climate API (`EC_Earth3P_HR`, 2013–2022) to the **Historical Weather API (ERA5), 1991–2020** (`03` §2).
- [x] `timezone=auto` (local days).
- [x] Wet day ≥ 1.0 mm. Count the years actually present instead of `/ 10`.
- [x] Replace cloud cover with `sunshine_duration` and `daylight_duration`.
- [x] **Delete** the synthetic "Average Day Profile" chart.
- [x] Add P10–P90 to every monthly statistic.

Engineering
- [x] Split `app.js` into ES modules (no build step, `<script type="module">`):
  `api/` (geocode, archive, forecast, climate + IndexedDB cache) · `stats/` (pure functions) · `query/` (**query spec** schema, URL ⇄ spec) · `views/` (cards, charts) · `ui/` (search, controls).
- [x] Define the **query spec** as a JSON Schema now (`schema/query-spec.schema.json`). The URL, the guided templates and the AI parser in Phase 3 all produce it.
- [x] `stats/` unit tests with `node --test` (37 tests, synthetic fixtures). Golden fixtures from the real API still to do.
- [x] URL state (`?q=profile&place=…&lat=…&lon=…&from=5&to=6`), so results are shareable and the back button works.
- [x] Error handling around every render. Chart.js was replaced by small SVG charts, so it is no longer a dependency.
- [x] GitHub Actions: unit tests and the WCAG contrast check (both themes) on every push and PR.
- [ ] Automated browser accessibility check in CI (axe was run manually during the sprint, with 0 violations). Deploy stays on GitHub Pages' branch deploy, so no workflow is needed.
- [x] Update `Claude.md` to match the new architecture and point to `docs/`.

**Done when:** for Paris, London and New York, the 1991–2020 monthly Tmax/Tmin and wet-day counts are within the `03` §5 targets of the official normals, and the test suite is green in CI.

---

## Phase 1: Redesign and the "Profile" answer (M–L), sprint 1 done (user testing still open)

**Goal:** fix legibility and duplication, and lay down the design system every later answer type will reuse.

Design direction: keep the "weather station meets editorial magazine" spirit, but **data first**:
- **Light theme by default. A dark theme is one click away**, and the choice is remembered in the browser. Both are built from the same tokens and **both must pass WCAG AA**: every text token ≥ 4.5:1 and every chart line or mark ≥ 3:1 against its background, checked automatically in CI for each theme. The current `--text-muted` (1.75:1) is removed.
- **Type:** one sans family for the UI and the data (e.g. IBM Plex Sans or Inter) with **tabular figures**. The serif is kept for the page title only. No mono for prose. Minimum 14 px for body text and 12 px for labels. Sentence-case labels instead of letter-spaced uppercase.
- **No animated atmosphere layers or grain.** Character comes from typography, a restrained palette and good charts.
- **A colour system for data:** one diverging scale for temperature anomalies (blue ↔ red, colour-blind-safe), one sequential blue for precipitation, one amber for sunshine. Used the same way on every chart, and tuned separately for each theme so that both stay legible.

Information architecture (removes the duplications listed in `01` §4):
- A compact **header with the search/question box**, always visible. Picking a place loads the dashboard directly (no location card, no Explore button).
- The **place name appears once**, as the dashboard title, with one provenance line (coordinates, grid-cell elevation, dataset, period).
- **One period control:** a 12-month strip with range selection, plus Year and season presets. It replaces the 17 buttons.
- An **answer page layout** shared by all answer types (`02` §3.2): answer sentence → 2–4 key figures with ranges → hero chart → "How this was computed" → follow-up chips → CSV download.

Profile answer content:
- Hero: a **monthly climate chart** with a high/low band and P10–P90 whiskers, and bars for wet days and sunshine hours.
- Key figures: typical high / low, wet days, rain total, sunshine hours per day, daylight.
- °C/°F and mm/in toggle.
- **Methodology page** (public version of `03`) linked from every card and from the footer.

**Done when:** a Lighthouse accessibility score ≥ 95 **in both themes**, every text style passes AA in both, the layout works at 360 px width, and five test users can answer "How many rainy days in Lisbon in May?" in under 15 seconds.

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

## Phase 3: The question box, AI-powered (M–L)

**Goal:** the user types any weather or climate question and gets the right dashboard.

**Principle (unchanged):** the AI **only translates the question into a query spec**, the JSON object defined in Phase 0. The site's own tested code computes every number. The AI never writes figures, so answers stay exact, reproducible and explainable.

```
Browser (GitHub Pages)                    Serverless proxy                       Claude API
──────────────────────                    ────────────────                       ──────────
"is October warmer than usual in Lyon?"
 + today's date, time zone, previous spec ─► POST /parse
                                            · origin check, rate limit,
                                              length limit, cache lookup
                                            · API key stored as a secret ──────► structured output
                                                                                  constrained to the
                                            ◄────────────── query spec (JSON) ── query-spec JSON Schema
 ◄── { type:"anomaly", place:"Lyon",
       period:"month-to-date", metrics:["tmax","tmin"] }
 · validate against the schema (again)
 · geocode "Lyon" → chips: [Anomaly] [Lyon, FR ▾] [October so far ▾] [Temperature ▾]
 · compute with ERA5 + forecast → answer page
```

### 3a. Guided questions (S)
- Sentence templates with editable blanks, shown under the box and on the empty home page ("How does *today* in *Paris* compare to normal?").
- They show users what they can ask, and they are the **fallback** when the proxy is unavailable or rate-limited.
- Minimal client-side rules only: a bare place name opens its Profile, and "today" + place opens the Anomaly answer. No full rule-based parser, because the AI covers that job.

### 3b. Serverless proxy (S–M)
- **Hosting:** Cloudflare Workers (recommended: generous free tier, global and simple) or an equivalent (Vercel / Netlify functions). One endpoint, `POST /parse`.
- **Secret:** the Anthropic API key is stored as a Worker secret. It never reaches the browser.
- **Abuse and cost protection:**
  - CORS limited to the site's origin.
  - Per-IP rate limit (for example 10 per minute and 100 per day).
  - Questions capped at 300 characters.
  - Identical normalised questions cached for 24 h.
  - A monthly spend limit set in the Anthropic Console.
- **Privacy:** questions are logged without IP addresses, only to grow the test corpus. A short notice sits under the box.

### 3c. AI parser (M)
- **Model call:** the Claude Messages API with **structured outputs**, so the response is constrained to the query-spec JSON Schema. On current models, structured outputs is the supported way to force a JSON shape. Forced tool choice is not.
- **Context sent:** the question, today's date and the user's time zone (to resolve "yesterday", "this winter", "since I was born in 1985"), plus the previous query spec for follow-ups ("and in July?", "compare with Madrid").
- **What it returns:**
  - Place names as text, never coordinates. The browser geocodes them, and ambiguous ones become a choice chip ("Paris, France" or "Paris, Texas").
  - `type: "unsupported"` with a reason code when the question is out of scope (e.g. a live storm warning). The site then shows the closest guided templates.
  - A confidence flag. When it is low, the chips are highlighted for the user to check.
- **Prompt:** a system prompt with the schema, a short description of each answer type and about 20 worked examples. It is fixed text, so it can be cached. The schema grows each time a phase adds an answer type.
- **Model choice:** pick it from measurement, not up front. Start with `claude-opus-5-5` at `low` effort, and run the same corpus on `claude-sonnet-5-5` and `claude-haiku-5-5`. Choose the cheapest model that meets the accuracy target. Rough cost per question, for about 2k input and 300 output tokens:

  | Model | Price per 1M tokens (input / output) | ≈ cost per question | ≈ 1,000 questions |
  |---|---|---|---|
  | Claude Opus 5.5 | $4 / $20 | $0.007–0.014 | $7–14 |
  | Claude Sonnet 5.5 | $2 / $10 | $0.004–0.007 | $4–7 |
  | Claude Haiku 5.5 | $0.10 / $0.50 | ≈ $0.0004 | ≈ $0.40 |

  The range depends on whether the fixed prompt is served from cache. Prices as of October 2026.

### 3d. Evaluation (S, then continuous)
- A **test corpus of 200+ realistic questions**, each with its expected query spec. It covers every answer type, relative dates, ambiguous places, follow-ups, out-of-scope questions, typos and non-English phrasing. Logged real questions are added over time.
- It runs in CI against the proxy (a small, fixed cost per run), and accuracy is tracked per answer type.

**Done when:** at least 90 % of the corpus produces the expected spec, 100 % of outputs pass schema validation, every answer can be corrected through the chips in one click, and the site still works through guided templates when the proxy is down.

---

## Phase 4: Compare places (M)

- [ ] 2–4 places on one page: add or remove place chips, URL `?q=compare&places=paris,lyon`.
- [ ] Same basis for every place (`03` §3.7). Small-multiple charts with **shared axes**.
- [ ] A difference table and one sentence per metric ("Lyon gets 31 more hours of sun in July and 2.4 °C warmer afternoons").
- [ ] "Today in A vs today in B" by reusing Phase 2.
- [ ] Köppen–Geiger badge per place.
- [ ] Extend the query schema, prompt examples and test corpus with `compare`.

---

## Phase 5: Climate evolution (Trend and Extremes) (M–L)

- [ ] Full ERA5 / ERA5-Land daily series from 1950, cached.
- [ ] Trend card: annual or seasonal series, Theil–Sen slope per decade with a 95 % CI, Mann–Kendall wording, and the pre-1979 segment shaded (`03` §3.6).
- [ ] **Warming stripes** for any place and season.
- [ ] Threshold days through time: hot days, tropical nights, frost days, wet days, heavy-rain days, longest dry spell.
- [ ] "Then vs now": 1961–1990 vs the last 10 years.
- [ ] "Since you were born": enter a year.
- [ ] Extremes: records in the dataset with dates, and exceedance counts for a user threshold. Return levels (GEV) only after validation.
- [ ] Extend the query schema, prompt examples and test corpus with `trend` and `extremes`.

---

## Phase 6: Find, Best time and Climate twin (M–L)

These features answer "**which places** match…?". Searching across hundreds of places can't be done live in the browser: it would mean downloading 30 years of data per city and would exceed the free API limits. So a **scheduled GitHub Action** precomputes a compact table of 1991–2020 monthly normals per city and commits it as `data/cities-normals.json` (a few hundred KB). The site reads that file instantly.

- [ ] **City table.** Coverage decided: **global, about 500 cities to start** (every capital, cities over 1 million inhabitants, and the most-visited tourist destinations). It can grow later. It is refreshed rarely, because normals change only once a decade.
  - **Quota check first.** If Open-Meteo counts a 30-year request as about 780 calls (`03` §2 *verify*), 500 cities is about 390k calls: roughly 6 weeks of the free daily quota. Options: (a) one month of a paid Open-Meteo plan for the initial build; (b) a spread-out free build; (c) computing the normals straight from the Copernicus ERA5 files in the Action. Decide once the real weighting is confirmed.
- [ ] **Find:** constraint filters (months, temperature range, max wet days, min sunshine, region) give a ranked list and a map.
- [ ] **Best time to visit:** a 12-month suitability strip for a place and the user's preferences. This works for any place, without needing the table.
- [ ] **Event-date probability:** a date and place give the chance of a wet day, of > 30 °C, and the typical range (±7-day window). This also works for any place.
- [ ] **Climate twin:** the nearest climates by standardised distance (`03` §3.7). Results can only be cities in the table.
- [ ] Extend the query schema, prompt examples and test corpus with `find`, `best_time` and `twin`.

---

## Phase 7: Projections and climate analogues (M)

- [ ] All 7 CMIP6 HighResMIP models from the Climate API. Delta method against ERA5 normals. Median and model range (`03` §3.8).
- [ ] "Mid-century (2021–2050) vs 1991–2020" band chart, plus the change in hot days, tropical nights and frost days.
- [ ] **"Which city today has my city's future climate?"**, using the Phase 6 table.
- [ ] Clear scenario labelling (high emissions) and a "projection ≠ forecast" note.
- [ ] Extend the query schema, prompt examples and test corpus with `projection`.

---

## Cross-cutting, every phase

| Topic | Practice |
|---|---|
| Methodology | Every new metric is added to `03-methodology.md` **before** it's coded, with its source. The version is bumped and shown on the site. |
| Testing | Unit tests for `stats/`, golden fixtures for API responses, the benchmark table re-run when data logic changes, and the question corpus re-run when the schema or prompt changes. |
| Accessibility | AA contrast **in both themes**, keyboard navigation, chart data available as a table or CSV, `prefers-reduced-motion` respected. |
| Performance | One request per place per dataset, IndexedDB cache, Chart.js as the only front-end dependency (pinned version), no web fonts beyond 2 families. |
| AI cost and safety | The AI only outputs a schema-validated query spec. Rate limits, caching and a monthly spend limit on the proxy. Model choice is re-evaluated against the corpus when new models ship. |
| Data etiquette | Open-Meteo attribution (CC BY 4.0) and ECMWF/Copernicus credit in the footer and on the Methodology page. Stay within the free non-commercial terms, or move to an API plan if the site grows. |
| Language | English UI and answers. |

## Sprint log

**Sprint 1 (done):** the data switched to ERA5 1991–2020 with correct statistics and 37 unit tests. Shipped: the query-spec schema and URL state, the light/dark design system with a CI contrast check, the new de-duplicated page, the Profile answer (sentence, key figures, three SVG charts, a month-by-month table with CSV download, "how this was computed"), and the public methodology page.

**Next sprint (proposed):**
1. With network access: record golden fixtures from the real API, run the official-normals benchmark, and confirm the API quota weighting.
2. A small user test of the Profile page (Phase 1 "done when").
3. Phase 2, "Today vs normal".

## Still open

- **Proxy host:** Cloudflare Workers is recommended. This needs a Cloudflare account and an Anthropic API key owned by you before Phase 3.
