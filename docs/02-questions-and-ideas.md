# 02 — What people ask about the weather, and what Weatherglass should answer

The aim is to move from "a climate dashboard for one place" to **"ask a weather or climate question, get a computed answer and the right dashboard."** This document lists the questions and groups them into a small number of **answer types**. The design, the data pipeline and the future question box are all built around those answer types.

## 1. Question catalogue

Brainstormed from your ideas (today vs. climate, city vs. city, climate evolution) and the questions people typically ask search engines, travel sites and weather services. ★ marks the highest-value questions to answer first.

### A. "Is this normal?": today and recent weather against the climate
- ★ Is today unusually hot or cold for the time of year? By how much?
- ★ How rare is today's temperature or rainfall? ("1 day in 20 at this time of year")
- ★ Has this month (or season) so far been wetter, drier, warmer or sunnier than normal?
- When was it last this hot, cold or wet on this date?
- Is this the warmest October in the dataset?
- How many days in a row has it been above normal?
- Is the coming week (forecast) going to be abnormal?

### B. "What is it like there?": climate profile for a place and period
- ★ What's the weather like in Lisbon in May? (highs, lows, rain days, sunshine, sea temperature)
- ★ How many rainy days in Bali in August? How much sunshine?
- Will I need a jacket in the evening? (night lows, wind, feels-like)
- How long are the days in Reykjavík in December?
- How humid or muggy does it get? (dew point, apparent temperature)
- Will there be snow at this altitude in February? (snowfall days, snow depth)

### C. "Which is better?": comparing places
- ★ Is Bordeaux sunnier than Lyon? Does it rain more in London or in Paris?
- ★ Compare 2–4 cities month by month (moving, holidays, remote work).
- Which city has a climate most similar to mine? ("climate twin")
- Where is it warm (> 20 °C) and dry in February within Europe? (constraint search)
- Which city in my list has the mildest winters or the most comfortable summers?

### D. "How is it changing?": climate evolution
- ★ How much has my city warmed since 1950, or since I was born?
- ★ Are there more hot days (> 30 °C), tropical nights (> 20 °C) and heatwaves than before?
- Are winters less snowy? Fewer frost days? Is the last spring frost coming earlier?
- Is rainfall becoming more intense (heaviest day per year)?
- Is my city getting sunnier or drier in summer?
- What could the climate look like in 2050? Which city today has my city's 2050 climate? (climate analogue)

### E. "What are the extremes?": records and risks
- Hottest and coldest day, wettest day, longest dry spell in the dataset.
- How often does it exceed 35 °C? How many days per year above a threshold I choose?
- What is a 1-in-10-year rainfall day here?

### F. "When should I…?": planning and activities
- ★ Best month to visit X (my ideal: 22–28 °C, < 5 rain days, lots of sun).
- What's the chance of rain on 15 June for an outdoor wedding? (event-date probability)
- Gardening: average last frost date, growing degree days.
- Energy: heating and cooling degree days (bills, heat-pump sizing).
- Solar panels: average solar radiation per month.
- Running or cycling: share of days with comfortable conditions (temperature, wind, rain).
- Mood: daylight hours and grey days in winter.

### G. Personal and curiosity
- What was the weather on the day I was born? On my wedding day?
- Was summer 2003 (or 2022) the worst on record here?

## 2. The answer types

Almost every question above maps to one of **eight answer types**. Each one is a dashboard template with fixed inputs, a computation and a visual form.

| Answer type | Inputs (the "query spec") | Core computation | Hero visual | Covers |
|---|---|---|---|---|
| **1. Profile** | place, months (range) | 1991–2020 normals + P10–P90 per month | Monthly band chart (high/low band + spread) with rain-day and sunshine bars | B, F (partly) |
| **2. Anomaly ("vs normal")** | place, date or date range (default: today) | Day-of-year climatology (±7-day window, 30 years) → anomaly, percentile, rarity | "Where today sits" percentile strip + last 30/90 days against the normal band | A |
| **3. Compare** | 2–4 places, months, metrics | Same normals on the same basis; differences | Small multiples + a "difference" sentence per metric | C |
| **4. Trend** | place, metric, season, start year | Annual series, Theil–Sen slope per decade with confidence interval, decade means | Warming stripes + annual series with trend line; "then vs now" decade bars | D |
| **5. Extremes** | place, metric, threshold or record | Records, threshold-day counts, block maxima / return levels | Ranked list + exceedance-per-year bars | E |
| **6. Find / Rank** | constraints (temperature, rain, sun, region, months) | Filter and rank a **precomputed** table of city normals | Ranked list + map | C (twin, search), F (best place) |
| **7. Best time** | place, preferences | Score each month (or week) against the preferences | 12-month "suitability" strip | F |
| **8. Projection** | place, horizon (2050), metric | Multi-model CMIP6 change signal applied to ERA5 normals (delta method) | Today vs 2050 band chart + model spread; climate analogue city | D (future) |

"On this day" (G) is an Anomaly query for a past date. The "Event-date probability" question (F) is a Profile query narrowed to a ±7-day window.

## 3. Product ideas

### 3.1 The question box (your "free field" idea)

**Principle: the AI doesn't generate answers. It translates the question into a query spec, and a deterministic engine computes the answer.** Numbers always come from the data, never from a language model. This keeps answers exact, reproducible and explainable.

```
"is it hotter than usual in Lyon today?"
        │  AI parser (Claude, behind a serverless proxy that holds the API key)
        ▼
{ type: "anomaly", places: ["Lyon"], date: "today", metrics: ["tmax","tmin"] }
        │  validated against the JSON Schema, place geocoded, shown as editable chips:
        │  [Anomaly] [Lyon, FR ▾] [today ▾] [temperature ▾]
        ▼
engine (ERA5 + forecast) ──► answer sentence + dashboard + "how computed"
```

- **AI parser (primary).** A small serverless proxy (Cloudflare Worker) holds the API key, which can't live on GitHub Pages. Claude returns only a query spec, constrained by structured outputs to the JSON Schema. It handles paraphrases, typos, relative dates ("last winter", "since I was born in 1985"), follow-ups ("and in July?") and questions typed in other languages. Answers are always in English.
- **Editable chips.** The parse is always shown as chips, so a misunderstanding costs one click to correct, and users can see how their question was understood.
- **Guided templates (discovery and fallback).** Sentence templates with blanks ("How does *[today]* in *[Paris]* compare to normal?") teach users what they can ask, and they keep the site usable when the proxy is down or rate-limited.
- **Out-of-scope questions** get an honest "I can't answer that yet" and the closest templates, not a guessed dashboard.

The query spec doubles as the **URL** (`?q=anomaly&place=lyon&date=today`). Every answer is shareable, and the back button works. Proxy, cost and evaluation details: `04-roadmap.md`, Phase 3.

### 3.2 The answer page

Every answer type produces the same layout:

1. **The answer as one sentence**, written by template from computed values:
   *"Today in Lyon reached 27.4 °C, 6.1 °C above the 1991–2020 normal for early October. That's warmer than 96 % of comparable days (about 1 day in 25)."*
2. **Two to four key figures**, each with its range.
3. **One hero chart** chosen for the answer type, plus optional secondary charts.
4. **"How this was computed"**: dataset, period, grid cell and elevation, definitions, caveats, and a link to the Methodology page.
5. **Follow-up chips**: "Compare with Paris", "See the trend since 1950", "Same question for July".
6. **Download CSV** for the numbers behind the chart.

### 3.3 Specific feature ideas

- **"Normal band" everywhere.** Any time series (recent days, the forecast, a past year) is drawn over the 1991–2020 P10–P90 band, so "is this normal?" is visible at a glance.
- **Warming stripes** (Ed Hawkins style) for any place and any season, with an explanation of what one stripe is.
- **"Since you were born"**: enter a year, get the change in average temperature, hot days and frost days since then.
- **Climate twin**: the precomputed city table plus a distance on standardised monthly normals finds the closest climates today, and in 2050 (climate analogues).
- **Wedding / event planner**: a date plus a place gives the probability of a wet day, of > 30 °C, and the typical range, from the ±7-day window over 30 years.
- **Best-time-to-visit strip**: twelve coloured cells scored against user preferences.
- **Comfort metrics** people actually feel: apparent temperature, dew point (muggy above ~16 °C, oppressive above ~20 °C), wind chill.
- **Practical indices**: heating and cooling degree days, growing degree days, last frost date, sunshine and solar radiation.
- **Köppen–Geiger class** computed from the normals ("Lyon: Cfb, temperate oceanic"), with a short explanation.
- **Units**: °C/°F, mm/in. English-only interface.

### 3.4 Out of scope (deliberately)

- Live weather alerts and nowcasting: other services do this better, with official warnings.
- Claims of **official records**: ERA5 is a reanalysis grid. We say "in this dataset since 1940", never "all-time record".
- Air quality, pollen and marine data: possible later (Open-Meteo has APIs for them), but not core.
