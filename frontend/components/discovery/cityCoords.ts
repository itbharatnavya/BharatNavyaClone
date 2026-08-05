// Static city → [lat, lng] table for the map view + "near me" distance sort.
// Free of any API key (matches DESIGN.md §12: static city table + Leaflet/OSM).
// Keys are lowercased city names; a few common aliases are included.

export const CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777],
  "navi mumbai": [19.033, 73.0297],
  thane: [19.2183, 72.9781],
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  ghaziabad: [28.6692, 77.4538],
  faridabad: [28.4089, 77.3178],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  surat: [21.1702, 72.8311],
  lucknow: [26.8467, 80.9462],
  kanpur: [26.4499, 80.3319],
  nagpur: [21.1458, 79.0882],
  indore: [22.7196, 75.8577],
  bhopal: [23.2599, 77.4126],
  patna: [25.5941, 85.1376],
  vadodara: [22.3072, 73.1812],
  ludhiana: [30.901, 75.8573],
  coimbatore: [11.0168, 76.9558],
  kochi: [9.9312, 76.2673],
  cochin: [9.9312, 76.2673],
  chandigarh: [30.7333, 76.7794],
  visakhapatnam: [17.6868, 83.2185],
  vizag: [17.6868, 83.2185],
  rajkot: [22.3039, 70.8022],
  nashik: [19.9975, 73.7898],
  guwahati: [26.1445, 91.7362],
  bhubaneswar: [20.2961, 85.8245],
  dehradun: [30.3165, 78.0322],
  amritsar: [31.634, 74.8723],
  varanasi: [25.3176, 82.9739],
  mysuru: [12.2958, 76.6394],
  mysore: [12.2958, 76.6394],
  madurai: [9.9252, 78.1198],
  raipur: [21.2514, 81.6296],
  ranchi: [23.3441, 85.3096],
  jodhpur: [26.2389, 73.0243],
  agra: [27.1767, 78.0081],
  goa: [15.2993, 74.124],
  panaji: [15.4909, 73.8278],
  jalandhar: [31.326, 75.5762],
  jamshedpur: [22.8046, 86.2029],
};

export function coordsForCity(city?: string | null): [number, number] | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return CITY_COORDS[key] || null;
}
