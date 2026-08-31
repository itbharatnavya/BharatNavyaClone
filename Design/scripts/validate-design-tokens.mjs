import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');
const strictRoots = ['src/design-system', 'src/coverage'];
const sourceOfTruth = 'src/design-system/tokens.css';
const legacyFiles = new Set([
  'src/styles.css',
  'src/home/home.css',
  'src/platform/platform.css',
  'src/ecosystem-lab/ecosystem.css',
]);
const legacyLimits = new Map([
  ['src/ecosystem-lab/ecosystem.css', 231],
  ['src/home/home.css', 494],
  ['src/platform/platform.css', 474],
  ['src/styles.css', 944],
]);

function declarationValue(line, property) {
  return line.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i'))?.[1].trim();
}

function isRaw(value) {
  return Boolean(value && !/^(?:var|calc|clamp|min|max)\(/.test(value) && !/^(?:0|auto|inherit|none)(?:\s|$)/.test(value));
}

const rules = [
  { name: 'raw colour', test: (line) => /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|oklch|hsl)\(/i.test(line) },
  { name: 'raw radius', test: (line) => isRaw(declarationValue(line, 'border-radius')) },
  { name: 'raw shadow', test: (line) => isRaw(declarationValue(line, 'box-shadow')) },
  { name: 'raw font size', test: (line) => isRaw(declarationValue(line, 'font-size')) },
  { name: 'raw spacing', test: (line) => ['gap', 'padding(?:-[a-z]+)?', 'margin(?:-[a-z]+)?'].some((property) => isRaw(declarationValue(line, property))) },
];

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(sourceRoot).filter((file) => ['.css', '.tsx'].includes(extname(file)));
const violations = [];
const legacyCounts = new Map();
const legacyRegressions = [];

for (const file of files) {
  const path = relative(root, file);
  if (path === sourceOfTruth || path.includes('/ecosystem-experiment/')) continue;
  const isStrict = strictRoots.some((directory) => path.startsWith(directory));
  const isLegacy = legacyFiles.has(path);
  if (!isStrict && !isLegacy) continue;

  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('token-exception:')) return;
    for (const rule of rules) {
      if (!rule.test(line)) continue;
      const record = `${path}:${index + 1} ${rule.name}`;
      if (isStrict) violations.push(record);
      if (isLegacy) legacyCounts.set(path, (legacyCounts.get(path) ?? 0) + 1);
    }
  });
}

if (legacyCounts.size) {
  console.log('Legacy token migration inventory (ratcheted; new files may not add debt):');
  for (const [file, count] of legacyCounts) {
    const limit = legacyLimits.get(file) ?? 0;
    console.log(`  ${file}: ${count}/${limit} raw declarations`);
    if (count > limit) legacyRegressions.push(`${file}: ${count} exceeds baseline ${limit}`);
  }
}

if (legacyRegressions.length) {
  console.error('\nLegacy token debt increased:');
  legacyRegressions.forEach((violation) => console.error(`  ${violation}`));
}

if (violations.length || legacyRegressions.length) {
  if (violations.length) {
  console.error('\nDesign-token violations in governed code:');
  violations.forEach((violation) => console.error(`  ${violation}`));
  }
  console.error('\nUse a semantic/component token or add a documented token-exception comment.');
  process.exit(1);
}

console.log('\nGoverned design-system and coverage files use approved tokens.');
