# 03 — Meteorological methodology

This document is the **source of truth** for how Weatherglass turns raw data into numbers. Each metric shown on the site must be defined here, and each definition should follow a published convention (WMO, ETCCDI, Copernicus/ECMWF). A shorter public version of this page will be linked from every dashboard ("How this was computed").

> Status: **v0.1, proposed.** Items marked *verify* must be confirmed against the live API documentation when they are implemented. The container used to write this had no network access to Open-Meteo.

## 1. Principles

1. **Observed past, modelled future.** Everything about the past and present comes from **reanalysis** (ERA5 family) and short-range analysis or forecast. Climate-model projections (CMIP6) are used **only** for the future, and only as a change signal relative to the reanalysis.
2. **Standard reference period.** Climate normals use **1991–2020**, the current WMO standard. Long-term change is measured from **1961–1990** or **1950–1979** baselines, and the baseline is always labelled.
3. **Show spread, not only means.** Every average comes with a range (P10–P90 by default) and the number of years `n` it's based on.
4. **Local days.** Daily aggregation follows the place's **local time zone** (`timezone=auto`).
5. **Computed, not generated.** Every number is computed by deterministic, unit-tested code. Language models, if used at all, only translate a question into a query.
6. **Say what it is.** Always state the dataset, the grid cell and its elevation, and the caveats. Never claim official records.

## 2. Data sources

| Use | Source (Open-Meteo endpoint) | Underlying data | Coverage | Notes |
|---|---|---|---|---|
| Geocoding | `geocoding-api.open-meteo.com/v1/search` | GeoNames | Global | Returns the place's elevation, time zone and population. |
| **Past climate and normals** | Historical Weather API `archive-api.open-meteo.com/v1/archive` | **ERA5** (≈ 0.25°, ≈ 25–30 km, from 1940) and **ERA5-Land** (≈ 0.1°, ≈ 9 km, from 1950) | Global, about 5 days of latency | ECMWF/Copernicus reanalysis: a weather model constrained by observations. Use `models=era5_land` for temperature where available (finer topography) and `era5` for long series and over the ocean. *verify* the exact model keys. |
| **Recent days, today and forecast** | Forecast API `api.open-meteo.com/v1/forecast` with `past_days` (up to 92) and `forecast_days` (up to 16) | Best-match operational models (ECMWF IFS, ICON, GFS…) | Global | Fills the ERA5 latency gap and gives "today". Values come from a different system than ERA5 and are **flagged as preliminary**. |
| **Future projections** | Climate API `climate-api.open-meteo.com/v1/climate` | CMIP6 HighResMIP, 7 models (CMCC_CM2_VHR4, FGOALS_f3_H, HiRAM_SIT_HR, MRI_AGCM3_2_S, EC_Earth3P_HR, MPI_ESM1_2_XR, NICAM16_8S), 1950–2050 | Global, downscaled | HighResMIP's future experiment uses a **high-emissions** forcing (close to SSP5-8.5). Say so. Use **all models** and report the median and spread. |
| Static city table (Find / Compare / Twin) | Precomputed by a scheduled GitHub Action from the Historical API | ERA5 normals for ≈ 500–1,000 cities | Global | Stored as JSON in the repo and served by GitHub Pages. Rate-limit-friendly. |

**Daily variables used** (Historical API): `temperature_2m_max`, `temperature_2m_min`, `temperature_2m_mean`, `apparent_temperature_max/min`, `precipitation_sum`, `rain_sum`, `snowfall_sum`, `precipitation_hours`, `sunshine_duration`, `daylight_duration`, `wind_speed_10m_max`, `wind_gusts_10m_max`, `shortwave_radiation_sum`, `et0_fao_evapotranspiration`. Hourly `dew_point_2m` and `relative_humidity_2m` are aggregated to daily values when needed. *verify* the variable list.

**Volume:** 30 years × 365 days × ~12 variables ≈ 130k values, a few hundred KB of JSON per place. That is one request, cached in IndexedDB.

## 3. Definitions

### 3.1 Climate normals (answer type *Profile*)

- **Monthly normal** of a daily variable `X` for month `m`: the mean over 1991–2020 of the 30 monthly means (temperature) or monthly totals (precipitation, sunshine), following **WMO-No. 1203** (*Guidelines on the Calculation of Climate Normals*).
- **Completeness rule:** a month counts if no more than 5 days are missing; a normal needs at least 24 of 30 years (≥ 80 %). Gridded reanalysis is complete, but the rule is coded anyway for robustness and for the forecast-filled recent period.
- **Spread:** P10 and P90 of the 30 monthly values ("in 8 years out of 10, July's average high is between … and …"). For daily distributions see §3.2.
- **Custom periods** (e.g. 15 May–10 June) are computed from the daily data directly, not by averaging monthly normals.

### 3.2 Day-of-year climatology (answer type *Anomaly*)

- For calendar day `d`, the reference sample is all days within **±7 days of `d`** across 1991–2020, about 450 values. This smooths sampling noise while keeping the seasonal cycle. (ETCCDI uses a 5-day window for percentile thresholds; ±7 days is a common choice for public-facing products. Keep the window a single constant and document it.)
- **Anomaly** = observed value − mean of the sample.
- **Percentile rank** = share of sample values below the observed value (Hazen/Weibull plotting position, documented in code).
- **Plain-language rarity**: percentile ≥ 90 → "warmer than 9 in 10 comparable days"; ≥ 95 → "about 1 day in 20"; ≥ 99 → "about 1 day in 100". Mirror the wording for the cold side. Below P90 and above P10, say "within the normal range".
- **Period anomalies** (month or season to date) compare the mean or total so far with the same calendar span in each reference year.
- Note: a "1 in 20 days" rarity **against 1991–2020** is not a return period of today's climate, which has shifted. Say this in the tooltip.

### 3.3 Precipitation

- **Wet day:** precipitation ≥ **1.0 mm** (WMO/ETCCDI `R1mm`). **Heavy-rain day:** ≥ 10 mm (`R10mm`). **Very heavy:** ≥ 20 mm (`R20mm`).
- **Chance of a wet day** in a period = wet days / days, from the daily data.
- **Monthly totals:** the mean of the 30 monthly totals, never `sum / hard-coded years`.
- **Snow:** `snowfall_sum` in cm of fresh snow. "Snowy day" = ≥ 1 cm. *verify* the units.
- **Dry spell:** the longest run of days with < 1 mm (ETCCDI `CDD`).
- **Caveat:** ERA5 precipitation is a model field. It is less reliable than temperature, especially for convective rain and in mountains and the tropics. Show precipitation with a lower-confidence note.

### 3.4 Temperature

- **High / low:** daily `temperature_2m_max/min` (2 m air temperature, local day). Shown together as a band. The **low is the night temperature** (Tmin usually occurs near sunrise, not at a fixed hour).
- **Threshold days (ETCCDI):** summer days `SU` (Tmax > 25 °C), hot days (Tmax ≥ 30 °C, a widely used national threshold), tropical nights `TR` (Tmin > 20 °C), frost days `FD` (Tmin < 0 °C), ice days `ID` (Tmax < 0 °C).
- **Heatwave:** use one documented definition. Proposal: ≥ 3 consecutive days with Tmax above the local day-of-year **P90** of 1961–1990 (relative, so it works anywhere). Mention that national services use their own definitions.
- **Comfort:** apparent temperature (Steadman, as computed by Open-Meteo), dew point bands (< 10 °C dry, 10–16 °C comfortable, 16–20 °C muggy, > 20 °C oppressive).
- **Degree days:** HDD base 18 °C (or 15.5 °C UK convention) and CDD base 22 °C (or 18 °C), from daily mean temperature. The base is configurable and labelled.
- **Growing degree days:** base 10 °C. **Last spring frost:** the last day before 1 July (or 1 January in the southern hemisphere) with Tmin ≤ 0 °C. Report the median and the P10–P90 date.

### 3.5 Sunshine, daylight and radiation

- **Sunshine duration:** hours per day with direct normal irradiance > 120 W/m² (the WMO definition), as modelled. Report it as hours per day and as % of possible (sunshine ÷ daylight).
- **Daylight:** astronomical day length.
- **Solar radiation:** `shortwave_radiation_sum` (MJ/m²), which is useful for solar-panel questions. Convert to kWh/m² by ÷ 3.6.

### 3.6 Trends (answer type *Trend*)

- Series: the annual (or seasonal) mean, total or count for each year, from 1950 (ERA5-Land) or 1940 (ERA5).
- **Slope:** **Theil–Sen** estimator (robust to outliers), reported per decade, with a 95 % confidence interval. **Significance:** Mann–Kendall test. Write it plainly ("clear warming trend" vs "no clear trend").
- **"Then vs now":** mean of 1961–1990 vs the latest complete 10 years, for both the averages and the threshold-day counts.
- **Warming stripes:** annual mean temperature anomaly against 1961–1990, colour scale centred on 0 and symmetric (±2.6σ, Hawkins convention), with an explanatory caption.
- **Caveat:** before 1979 (the satellite era), ERA5 is constrained by fewer observations, so early trends are less certain, especially outside Europe and North America. Mark that segment on charts.

### 3.7 Comparing places (answer types *Compare*, *Find*, *Twin*)

- Every place uses the **same dataset, period, day definition and thresholds**. If one place uses ERA5-Land and another can't, fall back to ERA5 for both.
- Differences are shown as absolute values ("+2.1 °C warmer", "38 fewer wet days a year"), not percentages of small numbers.
- **Climate similarity ("twin"):** Euclidean distance on a vector of 12 monthly Tmax, 12 monthly Tmin, 12 monthly log(precipitation + 1) and 12 monthly sunshine values, each standardised by the spread across all cities. Report the top 5 with a one-line explanation of the biggest difference.
- **Köppen–Geiger:** the standard thresholds (Beck et al. 2018 / Peel et al. 2007), computed from the monthly normals.

### 3.8 Future projections (answer type *Projection*)

- For each CMIP6 model, compute the **change** between the model's own 1991–2020 climatology and its **2021–2050** climatology. The Climate API stops at 2050, so a 30-year window centred on 2050 isn't available. Label the result "mid-century (2021–2050)", not "2050". *verify* the end year.
- Apply each model's change to the ERA5 normals (**delta method**: additive for temperature, multiplicative for precipitation). This removes each model's absolute bias.
- Report the **median** change and the **model range** (min–max of the 7 models). Never show a single model.
- State the scenario (high emissions) and that projections are not forecasts.
- **Climate analogue:** apply the projected change to the place's normals, then search the city table for today's nearest climate (Bastin et al. 2019, *Understanding climate change from a global analysis of city analogues*).

### 3.9 Extremes (answer type *Extremes*)

- **Records** are "in this dataset since 19xx". Show the date and the value. Never call them official records.
- **Exceedance counts:** days per year above or below a user threshold, as a time series.
- **Return levels:** a GEV fit on annual maxima (≥ 30 years), with a confidence interval. This comes later, after the simpler metrics are validated.

## 4. Known limitations (shown to users)

| Limitation | Effect | How we communicate it |
|---|---|---|
| Grid cell, not station | ERA5 ≈ 25–30 km and ERA5-Land ≈ 9 km cells smooth coasts, valleys and urban heat islands. Extremes are muted. | Show the grid-cell elevation next to the city elevation. Warn when they differ by > 200 m or when the place is coastal. |
| Reanalysis precipitation | Rain totals and intense convective rain are less reliable than temperature. | Lower-confidence badge on precipitation cards. |
| Pre-1979 data | Fewer observations constrain the reanalysis. | Shaded segment on trend charts. |
| Recent days | The last ≈ 5 days come from the forecast system, not ERA5. | "Preliminary" label and a different marker style. |
| Projections | One emissions scenario, 7 models, downscaled. | Show the model spread and state the scenario. |
| Local day | Some national services define the daily minimum over 18–18 or 09–09 UTC. Small differences against official normals are expected. | Methodology page. |

## 5. Validation (how we back up the numbers)

1. **Unit tests** for every statistic (normals, percentiles, wet days, Theil–Sen, Mann–Kendall, degree days, Köppen) on small hand-checked fixtures. `node --test`, no dependencies.
2. **Golden tests** on a few recorded API responses (committed fixtures), so refactors can't silently change numbers.
3. **Benchmark against official normals** for about 10 reference stations in varied climates (e.g. Paris-Montsouris / Météo-France, London Heathrow / Met Office, New York Central Park / NOAA, Madrid Retiro / AEMET, Sydney Observatory Hill / BoM, Singapore Changi, Denver, Reykjavík, Nairobi, Tokyo). Publish the comparison table on the Methodology page. **Targets to check, not guarantees:** monthly mean Tmax/Tmin within about ±1.5 °C at flat, inland, non-urban sites; annual precipitation within about ±25 %. Where a site misses, document why (coast, mountain, city).
4. **Peer-check the definitions**: each definition in §3 cites its source. Changes to this document are versioned (changelog at the bottom), and the site displays the methodology version.

## 6. References

- WMO (2017). *WMO Guidelines on the Calculation of Climate Normals*, WMO-No. 1203.
- ETCCDI. *Climate Extremes Indices* (27 core indices definitions), etccdi.pacificclimate.org.
- Hersbach, H. et al. (2020). The ERA5 global reanalysis. *Q. J. R. Meteorol. Soc.* 146, 1999–2049.
- Muñoz-Sabater, J. et al. (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications. *Earth Syst. Sci. Data* 13, 4349–4383.
- Haarsma, R. J. et al. (2016). High Resolution Model Intercomparison Project (HighResMIP v1.0) for CMIP6. *Geosci. Model Dev.* 9, 4185–4208.
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *JASA* 63, 1379–1389.
- Beck, H. E. et al. (2018). Present and future Köppen-Geiger climate classification maps at 1-km resolution. *Sci. Data* 5, 180214.
- Bastin, J.-F. et al. (2019). Understanding climate change from a global analysis of city analogues. *PLoS ONE* 14(7).
- Open-Meteo API documentation: open-meteo.com/en/docs (Historical Weather, Forecast, Climate, Geocoding).

## Changelog

- **v0.1** (2026-10-09): initial proposal written after the audit of the first version.
