/**
 * localize-images.js — replace unreliable loremflickr URLs (watermarks, red-bar
 * error frames) with a LOCAL, category-relevant image library served from the
 * frontend's /public/demo folder. Bulletproof for client demos: no third-party
 * runtime dependency, no watermarks, deterministic and offline-safe.
 *
 * Strategy: for each theme, try curated Unsplash CDN photos (keep only HTTP 200),
 * then top up to MIN_PER_THEME with clean Lorem Picsum images. Save locally, then
 * rewrite every loremflickr URL across the DB to a local /demo/<theme>-N.jpg,
 * choosing the image by a stable hash so cards vary but stay category-relevant.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");
const store = require("../lib/pg-store");

const PUBLIC_DEMO = path.resolve(__dirname, "../../frontend/public/demo");
const MIN_PER_THEME = 5;

// Curated Unsplash photo IDs per theme (generously listed; 404s are filtered out).
const U = (id) => `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=70`;
const THEMES = {
  textile: ["1618354691373-d851c5c3a990", "1620799140408-edc6dcb6d633", "1445205170230-053b83016050", "1523381210434-271e8be1f52b", "1558769132-cb1aea458c5e"],
  apparel: ["1489987707025-afc232f7ea0f", "1445205170230-053b83016050", "1483985988355-763728e1935b", "1479064555552-3ef4979f8908"],
  steel: ["1618354691373-d851c5c3a990", "1535813547-99c456a41d4a", "1567789884554-0b2c99c6e6e0", "1504328345606-18bbc8c9d7d1", "1565688534245-05d6b5be705c"],
  metal: ["1535813547-99c456a41d4a", "1504328345606-18bbc8c9d7d1", "1565688534245-05d6b5be705c"],
  electronics: ["1518709268805-4e9042af9f23", "1550009158-9ebf69173e03", "1517420704952-d9f39e95b43e", "1591799264318-7e6ef8ddb7ea", "1526374965328-7f61d4dc18c5"],
  packaging: ["1586528116311-ad8dd3c8310d", "1607166452427-7e4477079cb9", "1553413077-190dd305871c", "1595246140625-573b715d11dc"],
  agriculture: ["1500937386664-56d1dfef3854", "1574943320219-553eb213f72d", "1625246333195-78d9c38ad449", "1592982537447-7440770cbfc9", "1560493676-04071c5f467b"],
  construction: ["1503387762-592deb58ef4e", "1541888946425-d81bb19240f5", "1590674899484-d5640e854abe", "1504307651254-35680f356dfd", "1587582423116-ec07293f0395"],
  automotive: ["1486262715619-67b85e0b08d3", "1552519507-da3b142c6e3d", "1503376780353-7e6692767b70", "1493238792000-8113da705763"],
  business: ["1581091226825-a6a2a5aee158", "1552664730-d307ca884978", "1497215728101-856f4ea42174", "1600880292203-757bb62b4baf", "1521737604893-d14cc237f11d"],
  medical: ["1519494026892-80bbd2d6fd0d", "1584982751601-97dcc096659c", "1576091160399-112ba8d25d1d", "1583324113626-70df0f4deaab"],
  machinery: ["1504328345606-18bbc8c9d7d1", "1565043666747-69f6646db940", "1518709268805-4e9042af9f23", "1581092160607-ee22621dd758"],
  home: ["1581578731548-c64695cc6952", "1600585154340-be6161a56a0c", "1556909212-d5b604d0c90d", "1600607687939-ce8a6c25118c"],
  chemical: ["1581093458791-9d42e3c7e117", "1532187863486-abf9dbad1b69", "1554475900-0a0350e3fc7b", "1576086213369-97a306d36557"],
  logistics: ["1504917595217-d4dc5ebe6122", "1553413077-190dd305871c", "1601599963565-b7f49d6c6d7a", "1586528116311-ad8dd3c8310d"],
  retail: ["1441986300917-64674bd600d8", "1555529669-e69e7aa0ba9a", "1560472354-b33ff0c44a43", "1472851294608-062f824d29cc"],
  industry: ["1581091226825-a6a2a5aee158", "1565043666747-69f6646db940", "1504328345606-18bbc8c9d7d1", "1518709268805-4e9042af9f23"],
  food: ["1504674900247-0877df9cc836", "1546069901-ba9599a7e63c", "1490645935967-10de6ba17061", "1567620905732-2d1ec7ab7445"],
};

// loremflickr keyword token -> theme
const KEYWORD_THEME = {
  "textile,fabric": "textile", "steel,metal": "steel", "steel,factory": "steel",
  "electronics,circuit": "electronics", "electronics,led": "electronics",
  "packaging,cardboard": "packaging", "grain,agriculture": "agriculture",
  "agriculture,farm": "agriculture", "construction,cement": "construction",
  "construction,building": "construction", "car,tyre": "automotive",
  "car,automotive": "automotive", "business,office": "business",
  "office,accounting": "business", "accounting,finance": "business",
  "medical,hospital": "medical", "machine,industrial": "machinery",
  "home,repair": "home", "chemical,laboratory": "chemical",
  "logistics,warehouse": "logistics", "product,shop": "retail",
  "factory,industry": "industry", "food": "food",
};

function download(url, dest) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) { file.close(); fs.unlink(dest, () => {}); return resolve(false); }
      const ct = res.headers["content-type"] || "";
      if (!ct.startsWith("image/")) { file.close(); fs.unlink(dest, () => {}); res.resume(); return resolve(false); }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(true)));
    });
    req.on("error", () => { file.close(); fs.unlink(dest, () => {}); resolve(false); });
    req.setTimeout(15000, () => { req.destroy(); file.close(); fs.unlink(dest, () => {}); resolve(false); });
  });
}

async function buildLibrary() {
  fs.mkdirSync(PUBLIC_DEMO, { recursive: true });
  const lib = {};
  for (const [theme, ids] of Object.entries(THEMES)) {
    lib[theme] = [];
    let n = 0;
    for (const id of ids) {
      if (lib[theme].length >= MIN_PER_THEME) break;
      const name = `${theme}-${n + 1}.jpg`;
      const ok = await download(U(id), path.join(PUBLIC_DEMO, name));
      if (ok) { lib[theme].push(`/demo/${name}`); n++; }
    }
    // top up with clean picsum so every theme has MIN images
    let picsumSeed = 1;
    while (lib[theme].length < MIN_PER_THEME) {
      const name = `${theme}-${n + 1}.jpg`;
      const ok = await download(`https://picsum.photos/seed/${theme}${picsumSeed}/800/600`, path.join(PUBLIC_DEMO, name));
      picsumSeed++;
      if (ok) { lib[theme].push(`/demo/${name}`); n++; }
      if (picsumSeed > 12) break;
    }
    process.stdout.write(`${theme}:${lib[theme].length} `);
  }
  console.log("\nLibrary built at", PUBLIC_DEMO);
  return lib;
}

function themeFor(url) {
  const m = url.match(/loremflickr\.com\/\d+\/\d+\/([a-z,]+)/);
  if (m && KEYWORD_THEME[m[1]]) return KEYWORD_THEME[m[1]];
  return "business"; // safe clean default
}
function pick(list, key) {
  if (!list || !list.length) return null;
  const h = crypto.createHash("md5").update(String(key)).digest("hex");
  return list[parseInt(h.slice(0, 8), 16) % list.length];
}
function rewrite(val, lib, key) {
  if (typeof val !== "string" || !val.includes("loremflickr.com")) return val;
  const theme = themeFor(val);
  return pick(lib[theme], key + "|" + val) || val;
}
// deep-walk any object/array, rewriting loremflickr strings in place
function deepRewrite(obj, lib, key) {
  if (Array.isArray(obj)) { for (let i = 0; i < obj.length; i++) obj[i] = (typeof obj[i] === "object" && obj[i]) ? (deepRewrite(obj[i], lib, key + "." + i), obj[i]) : rewrite(obj[i], lib, key + "." + i); return obj; }
  if (obj && typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = (typeof obj[k] === "object" && obj[k]) ? (deepRewrite(obj[k], lib, key + "." + k), obj[k]) : rewrite(obj[k], lib, key + "." + k); }
  return obj;
}

async function migrate(lib) {
  const collections = ["listings.json", "users.json", "stories.json", "ad-bookings.json", "blogs.json"];
  for (const col of collections) {
    const rows = await store.all(col);
    let changed = 0;
    for (const row of rows) {
      const before = JSON.stringify(row);
      deepRewrite(row, lib, row.id || col);
      if (JSON.stringify(row) !== before) { await store.update(col, row.id, row); changed++; }
    }
    console.log(`${col}: ${changed} records updated`);
  }
}

(async () => {
  const lib = await buildLibrary();
  await migrate(lib);
  console.log("Done. All loremflickr URLs replaced with local /demo images.");
})();
