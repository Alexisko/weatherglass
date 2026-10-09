// Open-Meteo Geocoding API (GeoNames). https://open-meteo.com/en/docs/geocoding-api
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchPlaces(query, { signal } = {}) {
  const url = `${GEO_API}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();
  return (data.results || []).map(r => ({
    name: r.name,
    country: r.country || undefined,
    admin1: r.admin1 || undefined,
    latitude: r.latitude,
    longitude: r.longitude,
    elevation: r.elevation,
    population: r.population,
  }));
}
