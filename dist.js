const { cp, mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');

const manifest = require('./manifest.json');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');
const sourceDir = path.join(distDir, 'source');

// Everything an AMO reviewer needs to run the README's build command and get
// the submitted artifact back.
const sourceFiles = [
	'README.md',
	'dist.js',
	'eslint.config.js',
	'manifest.json',
	'package.json',
	'scripts',
	'src',
	'test',
	'webpack.config.js',
	'yarn.lock',
	...Object.values(manifest.icons),
];

const zip = async (dir, filename) => {
	const { cmd } = await import('web-ext');

	await cmd.build({
		sourceDir: dir,
		artifactsDir: distDir,
		filename,
		overwriteDest: true,
	});
};

const writeFirefoxManifest = async () => {
	const firefox = {
		...manifest,
		browser_specific_settings: {
			gecko: {
				// Identifies the listing on AMO; changing it publishes a different add-on.
				id: 'net.cozic.plugins.GitHubRawActionLogViewer@nospam',
				// Required for new AMO listings, and one-way: later versions cannot drop it.
				data_collection_permissions: {
					required: ['none'],
				},
			},
		},
	};

	await writeFile(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefox, null, '\t'));
};

const stageSource = async () => {
	for (const file of sourceFiles) {
		const target = path.join(sourceDir, file);
		await mkdir(path.dirname(target), { recursive: true });
		await cp(path.join(rootDir, file), target, { recursive: true });
	}
};

const main = async () => {
	await rm(firefoxDir, { recursive: true, force: true });
	await cp(chromeDir, firefoxDir, { recursive: true });
	await writeFirefoxManifest();

	await rm(sourceDir, { recursive: true, force: true });
	await stageSource();

	await zip(chromeDir, 'chrome.zip');
	await zip(firefoxDir, 'firefox.zip');
	await zip(sourceDir, 'source.zip');
};

main().catch(error => {
	console.error(error);
	process.exit(1);
});
