const { readFileSync } = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');

const manifest = require('../manifest.json');

// The budget is on raw bytes: the bundle is downloaded once but parsed on
// every raw-log page.
const budget = 48 * 1024;

const bundle = path.join(__dirname, '..', 'dist', 'chrome', manifest.content_scripts[0].js[0]);
const bytes = readFileSync(bundle);

console.log(path.relative(process.cwd(), bundle));
console.log(`  raw   ${bytes.length.toLocaleString('en-US')} B`);
console.log(`  gzip  ${gzipSync(bytes, { level: 9 }).length.toLocaleString('en-US')} B`);

if (bytes.length > budget) {
	console.error(`over the ${budget.toLocaleString('en-US')} B budget`);
	process.exit(1);
}
