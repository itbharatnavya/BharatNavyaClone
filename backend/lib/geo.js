/**
 * geo.js — city coordinate lookup + great-circle distance (Geo / "Near me").
 *
 * BharatSource has no geocoder; listings and sellers carry a free-text `location.city`.
 * This module maps ~40 major Indian cities to {lat,lng} so we can answer "near me"
 * queries and stamp coordinates onto listings/sellers at write time.
 *
 * Exports:
 *   coordsForCity(city)      -> {lat,lng} | null   (case-insensitive, trims whitespace)
 *   haversineKm(a, b)        -> number             (great-circle km between two {lat,lng})
 *   distanceKm(cityA, cityB) -> number | null      (via coords; null if either unknown)
 */

// Major Indian cities → approximate city-centre coordinates (WGS84 degrees).
const CITY_COORDS = {
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ludhiana: { lat: 30.901, lng: 75.8573 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Vadodara: { lat: 22.3072, lng: 73.1812 },
  Rajkot: { lat: 22.3039, lng: 70.8022 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Vijayawada: { lat: 16.5062, lng: 80.648 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Faridabad: { lat: 28.4089, lng: 77.3178 },
  Ghaziabad: { lat: 28.6692, lng: 77.4538 },
  Gurugram: { lat: 28.4595, lng: 77.0266 },
  Gurgaon: { lat: 28.4595, lng: 77.0266 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Thane: { lat: 19.2183, lng: 72.9781 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Amritsar: { lat: 31.634, lng: 74.8723 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Raipur: { lat: 21.2514, lng: 81.6296 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Jodhpur: { lat: 26.2389, lng: 73.0243 },
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
};

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Coordinates for a city name (case-insensitive, whitespace-trimmed), or null. */
function coordsForCity(city) {
  if (!city) return null;
  const key = String(city).trim().toLowerCase();
  if (!key) return null;
  for (const name of Object.keys(CITY_COORDS)) {
    if (name.toLowerCase() === key) return CITY_COORDS[name];
  }
  return null;
}

/** Great-circle distance in km between two {lat,lng} points (haversine formula). */
function haversineKm(a, b) {
  if (!a || !b) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Distance in km between two city names via their coords; null if either is unknown. */
function distanceKm(cityA, cityB) {
  const a = coordsForCity(cityA);
  const b = coordsForCity(cityB);
  if (!a || !b) return null;
  return haversineKm(a, b);
}

module.exports = { CITY_COORDS, coordsForCity, haversineKm, distanceKm };
