import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const governed = [
  "app/living-evidence.css",
  "app/page.tsx",
  "app/directory/page.tsx",
  "app/recruitment/page.tsx",
  "components/evidence/EvidenceMedia.tsx",
  "components/evidence/EvidenceRecord.tsx",
  "components/evidence/AdvertisingSlot.tsx",
  "components/evidence/UpdateFeature.tsx",
  "components/evidence/UpdateRail.tsx",
  "components/home/UniversalSearch.tsx",
  "app/search/page.tsx",
];

const errors = [];
for (const file of governed) {
  const content = await readFile(resolve(root, file), "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/#[0-9a-f]{3,8}\b/i.test(line)) errors.push(`${file}:${index + 1} uses a raw hex colour`);
    if (/border-radius\s*:\s*(?!var\(|0\b|50%)[^;}]+/i.test(line)) errors.push(`${file}:${index + 1} uses an unauthorized radius`);
  });
}

const searchContractChecks = [
  ["app/globals.css", "--bn-radius-search: 999px;"],
  ["app/globals.css", "--bn-radius-search-stacked: var(--bn-radius-card);"],
  ["app/globals.css", "--bn-radius-search-action: 999px;"],
  ["app/bharat-navya-home.css", "border-radius:var(--bn-radius-search)"],
  ["app/bharat-navya-home.css", "border-radius:var(--bn-radius-search-action)"],
  ["app/directory-design.css", "border-radius:var(--bn-radius-search)"],
  ["app/directory-design.css", "border-radius:var(--bn-radius-search-stacked)"],
  ["components/recruitment/RoleSearchBar.tsx", "border-radius: var(--bn-radius-search);"],
  ["components/recruitment/RoleSearchBar.tsx", "border-radius: var(--bn-radius-search-stacked);"],
  ["app/living-evidence.css", ".le-gateway{min-height:5rem;"],
  ["app/living-evidence.css", "border-radius:var(--bn-radius-search);box-shadow:var(--bn-shadow-card)"],
  ["app/living-evidence.css", ".le-hero::before,.le-hero::after"],
];

for (const [file, contract] of searchContractChecks) {
  const content = await readFile(resolve(root, file), "utf8");
  if (!content.includes(contract)) errors.push(`${file} is missing shared search contract: ${contract}`);
}

const evidenceCss = await readFile(resolve(root, "app/living-evidence.css"), "utf8");
if (/\.le-page \.bn-(?:universal|section)-search[^\n]*border-radius/.test(evidenceCss)) {
  errors.push("app/living-evidence.css must not override the shared public-search radius");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Design-system validation passed for ${governed.length} governed files.`);
