// Single source of truth for methodology constants.
// Any change here must be reflected in docs/03-methodology.md and methodology.html.

export const METHODOLOGY_VERSION = '0.2';

// WMO standard climate normal period (WMO-No. 1203).
export const REF_START_YEAR = 1991;
export const REF_END_YEAR   = 2020;

// A normal needs at least 80 % of the possible years (24 of 30).
export const MIN_YEARS_SHARE = 0.8;

// WMO / ETCCDI R1mm: a wet day has at least 1.0 mm of precipitation.
export const WET_DAY_MM = 1.0;

// A snow day has at least 1 cm of fresh snowfall.
export const SNOW_DAY_CM = 1.0;

// "Most days" range: 10th to 90th percentile of daily values.
export const SPREAD_LOW_P  = 0.10;
export const SPREAD_HIGH_P = 0.90;

// WMO "3/5 rule" for monthly means: no more than 5 missing days in total
// and no more than 3 consecutive missing days.
export const MAX_MISSING_DAYS = 5;
export const MAX_CONSECUTIVE_MISSING = 3;

export const DATASET = {
  id: 'era5',
  label: 'ERA5 reanalysis (ECMWF / Copernicus)',
  provider: 'Open-Meteo Historical Weather API',
};
