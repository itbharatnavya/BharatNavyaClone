// indiaGeo.ts — plain data module powering every state/city dropdown in the app.
// No runtime dependencies: just India's states + union territories and a solid set
// of major cities per state. Consumed by the seller onboarding/profile forms, the
// branch LocationsManager, and the /sell listing-location picker.
//
// State names here MUST stay in sync with the labels stored on the backend
// (sellerProfile.location.state, listing.location.state) so filtering lines up.

// All 28 states + 8 union territories (states first, then UTs).
export const INDIA_STATES: string[] = [
  // --- 28 states ---
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // --- 8 union territories ---
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Major cities per state/UT. Not exhaustive — a practical, real set for dropdowns.
// Users can always fall back to typing an "Other city" in the UI when theirs isn't
// listed, so this map never blocks a seller.
export const CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry",
    "Tirupati", "Kadapa", "Kakinada", "Anantapur", "Eluru", "Ongole", "Chittoor",
    "Machilipatnam", "Srikakulam",
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila", "Tezu", "Along",
  ],
  Assam: [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur",
    "Bongaigaon", "Dhubri", "Sivasagar", "Goalpara", "Barpeta",
  ],
  Bihar: [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif",
    "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Bettiah", "Motihari",
  ],
  Chhattisgarh: [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Raigarh",
    "Jagdalpur", "Ambikapur", "Dhamtari",
  ],
  Goa: [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Curchorem",
  ],
  Gujarat: [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar",
    "Junagadh", "Anand", "Navsari", "Morbi", "Nadiad", "Bharuch", "Mehsana",
    "Gandhidham", "Vapi", "Porbandar",
  ],
  Haryana: [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar",
    "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Kurukshetra",
  ],
  "Himachal Pradesh": [
    "Shimla", "Mandi", "Solan", "Dharamshala", "Bilaspur", "Kullu", "Hamirpur", "Una",
    "Nahan", "Palampur", "Chamba",
  ],
  Jharkhand: [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh",
    "Giridih", "Ramgarh", "Phusro", "Medininagar",
  ],
  Karnataka: [
    "Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi",
    "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Raichur",
    "Bidar", "Hospet", "Hassan", "Udupi",
  ],
  Kerala: [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur",
    "Alappuzha", "Palakkad", "Malappuram", "Kottayam", "Pathanamthitta", "Idukki",
    "Kasaragod",
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna",
    "Ratlam", "Rewa", "Katni", "Singrauli", "Burhanpur", "Khandwa", "Chhindwara",
  ],
  Maharashtra: [
    "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur", "Amravati",
    "Kolhapur", "Navi Mumbai", "Sangli", "Jalgaon", "Akola", "Latur", "Ahmednagar",
    "Nanded", "Chandrapur", "Dhule",
  ],
  Manipur: [
    "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul", "Senapati",
  ],
  Meghalaya: [
    "Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar", "Baghmara",
  ],
  Mizoram: [
    "Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib", "Saiha",
  ],
  Nagaland: [
    "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Mon",
  ],
  Odisha: [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore",
    "Baripada", "Bhadrak", "Jharsuguda", "Angul",
  ],
  Punjab: [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur",
    "Pathankot", "Moga", "Firozpur", "Batala", "Barnala",
  ],
  Rajasthan: [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar",
    "Sikar", "Sri Ganganagar", "Pali", "Bharatpur", "Bhiwadi", "Tonk",
  ],
  Sikkim: [
    "Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo", "Singtam",
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli",
    "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur",
    "Nagercoil", "Karur", "Hosur", "Kanchipuram",
  ],
  Telangana: [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam",
    "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Miryalaguda", "Siddipet",
  ],
  Tripura: [
    "Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Belonia", "Ambassa",
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj",
    "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida",
    "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Ayodhya",
  ],
  Uttarakhand: [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh",
    "Nainital", "Mussoorie", "Pithoragarh",
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda",
    "Baharampur", "Kharagpur", "Haldia", "Jalpaiguri", "Darjeeling", "Krishnanagar",
  ],
  // --- union territories ---
  "Andaman and Nicobar Islands": [
    "Port Blair", "Diglipur", "Rangat", "Mayabunder",
  ],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
  Delhi: [
    "New Delhi", "Delhi", "Dwarka", "Rohini", "Pitampura", "Saket", "Karol Bagh",
    "Janakpuri",
  ],
  "Jammu and Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Sopore",
  ],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti", "Agatti", "Amini", "Andrott"],
  Puducherry: ["Puducherry", "Karaikal", "Yanam", "Mahe"],
};

/** All states + UTs, in canonical order — feed straight into a <select>. */
export function statesList(): string[] {
  return INDIA_STATES;
}

/** Major cities for a given state (empty array when the state is unknown/blank). */
export function citiesForState(state: string | null | undefined): string[] {
  if (!state) return [];
  return CITIES_BY_STATE[state] || [];
}

/** Flat, de-duplicated, alphabetically sorted list of every city we know. */
export const ALL_CITIES: string[] = Array.from(
  new Set(Object.values(CITIES_BY_STATE).flat())
).sort((a, b) => a.localeCompare(b));

/** Label shown for a listing that serves the whole country. */
export const PAN_INDIA_LABEL = "PAN India";

/**
 * Human-readable location label. Returns "PAN India" when panIndia is set, else
 * "City, State" (or whichever half is present). Used by owned display surfaces so
 * PAN-India listings never render a blank/missing city.
 */
export function formatLocation(opts: {
  city?: string | null;
  state?: string | null;
  panIndia?: boolean;
}): string {
  if (opts.panIndia) return PAN_INDIA_LABEL;
  const city = (opts.city || "").trim();
  const state = (opts.state || "").trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "";
}

// ------------------------------------------------------------------
// Nearest-city lookup for the search bar's "use my location" city
// auto-select (components/home/HomeHero.tsx). Approximate lat/lng for a
// curated set of major cities — every name here is verified to exist
// verbatim in CITIES_BY_STATE above, so a match always corresponds to a
// real <option>. Deliberately NOT survey-precision: this only needs to
// find the closest well-known city, not pinpoint the visitor. Entirely
// client-side — no reverse-geocoding API call, per CLAUDE.md's file-based,
// no-new-external-service default.
const CITY_COORDS: [string, number, number][] = [
  ["Visakhapatnam", 17.6868, 83.2185], ["Vijayawada", 16.5062, 80.648],
  ["Guntur", 16.3067, 80.4365], ["Nellore", 14.4426, 79.9865],
  ["Kakinada", 16.9891, 82.2475], ["Guwahati", 26.1445, 91.7362],
  ["Dibrugarh", 27.4728, 94.912], ["Patna", 25.5941, 85.1376],
  ["Gaya", 24.7955, 84.9994], ["Bhagalpur", 25.2425, 86.9842],
  ["Darbhanga", 26.1542, 85.8918], ["Raipur", 21.2514, 81.6296],
  ["Bhilai", 21.1938, 81.3509], ["Panaji", 15.4909, 73.8278],
  ["Ahmedabad", 23.0225, 72.5714], ["Surat", 21.1702, 72.8311],
  ["Vadodara", 22.3072, 73.1812], ["Rajkot", 22.3039, 70.8022],
  ["Bhavnagar", 21.7645, 72.1519], ["Jamnagar", 22.4707, 70.0577],
  ["Gurugram", 28.4595, 77.0266], ["Faridabad", 28.4089, 77.3178],
  ["Panipat", 29.3909, 76.9635], ["Shimla", 31.1048, 77.1734],
  ["Ranchi", 23.3441, 85.3096], ["Jamshedpur", 22.8046, 86.2029],
  ["Dhanbad", 23.7957, 86.4304], ["Bengaluru", 12.9716, 77.5946],
  ["Mysuru", 12.2958, 76.6394], ["Hubballi", 15.3647, 75.124],
  ["Mangaluru", 12.9141, 74.856], ["Belagavi", 15.8497, 74.4977],
  ["Kalaburagi", 17.3297, 76.8343], ["Davanagere", 14.4644, 75.9218],
  ["Thiruvananthapuram", 8.5241, 76.9366], ["Kochi", 9.9312, 76.2673],
  ["Kozhikode", 11.2588, 75.7804], ["Thrissur", 10.5276, 76.2144],
  ["Indore", 22.7196, 75.8577], ["Bhopal", 23.2599, 77.4126],
  ["Jabalpur", 23.1815, 79.9864], ["Gwalior", 26.2183, 78.1828],
  ["Ujjain", 23.1793, 75.7849], ["Mumbai", 19.076, 72.8777],
  ["Pune", 18.5204, 73.8567], ["Nagpur", 21.1458, 79.0882],
  ["Nashik", 19.9975, 73.7898], ["Thane", 19.2183, 72.9781],
  ["Aurangabad", 19.8762, 75.3433], ["Solapur", 17.6599, 75.9064],
  ["Amravati", 20.9374, 77.7796], ["Kolhapur", 16.705, 74.2433],
  ["Navi Mumbai", 19.033, 73.0297], ["Sangli", 16.8524, 74.5815],
  ["Akola", 20.7002, 77.0082], ["Nanded", 19.1383, 77.321],
  ["Bhubaneswar", 20.2961, 85.8245], ["Cuttack", 20.4625, 85.8828],
  ["Rourkela", 22.2604, 84.8536], ["Ludhiana", 30.901, 75.8573],
  ["Amritsar", 31.634, 74.8723], ["Jalandhar", 31.326, 75.5762],
  ["Jaipur", 26.9124, 75.7873], ["Jodhpur", 26.2389, 73.0243],
  ["Udaipur", 24.5854, 73.7125], ["Kota", 25.2138, 75.8648],
  ["Bikaner", 28.0229, 73.3119], ["Ajmer", 26.4499, 74.6399],
  ["Chennai", 13.0827, 80.2707], ["Coimbatore", 11.0168, 76.9558],
  ["Madurai", 9.9252, 78.1198], ["Tiruchirappalli", 10.7905, 78.7047],
  ["Salem", 11.6643, 78.146], ["Tirunelveli", 8.7139, 77.7567],
  ["Erode", 11.341, 77.7172], ["Hyderabad", 17.385, 78.4867],
  ["Warangal", 17.9689, 79.5941], ["Lucknow", 26.8467, 80.9462],
  ["Kanpur", 26.4499, 80.3319], ["Ghaziabad", 28.6692, 77.4538],
  ["Agra", 27.1767, 78.0081], ["Varanasi", 25.3176, 82.9739],
  ["Meerut", 28.9845, 77.7064], ["Prayagraj", 25.4358, 81.8463],
  ["Bareilly", 28.367, 79.4304], ["Aligarh", 27.8974, 78.088],
  ["Moradabad", 28.8386, 78.7733], ["Saharanpur", 29.968, 77.546],
  ["Gorakhpur", 26.7606, 83.3732], ["Noida", 28.5355, 77.391],
  ["Firozabad", 27.1592, 78.3957], ["Jhansi", 25.4484, 78.5685],
  ["Muzaffarnagar", 29.4727, 77.7085], ["Dehradun", 30.3165, 78.0322],
  ["Kolkata", 22.5726, 88.3639], ["Howrah", 22.5958, 88.2636],
  ["Durgapur", 23.5204, 87.3119], ["Asansol", 23.6739, 86.9524],
  ["Siliguri", 26.7271, 88.3953], ["Chandigarh", 30.7333, 76.7794],
  ["Delhi", 28.6139, 77.209], ["Jammu", 32.7266, 74.857],
  ["Srinagar", 34.0837, 74.7973], ["Puducherry", 11.9416, 79.8083],
  ["Aizawl", 23.7271, 92.7176], ["Imphal", 24.817, 93.9368],
  ["Kohima", 25.6751, 94.1086], ["Itanagar", 27.0844, 93.6053],
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Max distance (km) before we give up rather than suggest a far-off "nearest"
// city — most of India is within this of a covered city, but this keeps a
// visitor outside our coverage (or with a noisy/coarse location fix) from
// landing on a misleading pick.
const MAX_MATCH_KM = 120;

/** Nearest known city to a lat/lng, or null if nothing is close enough to be useful. */
export function detectNearestCity(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, clat, clon] of CITY_COORDS) {
    const d = haversineKm(lat, lon, clat, clon);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return bestDist <= MAX_MATCH_KM ? best : null;
}
