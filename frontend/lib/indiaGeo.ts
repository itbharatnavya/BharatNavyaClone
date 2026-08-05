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
