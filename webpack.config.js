const path = require('path');
const { readFileSync } = require('fs');

const rootDir = __dirname;
const readManifest = () => JSON.parse(readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

// The manifest decides where the bundle and the icons live; webpack follows it.
const [bundlePath, ...extraScripts] = readManifest().content_scripts.flatMap(script => script.js);

if (extraScripts.length > 0) {
	throw new Error(`manifest.json declares ${extraScripts.length + 1} content scripts; webpack emits one bundle`);
}

const pluginName = 'emit-static-files';
const emitStaticFiles = {
	apply(compiler) {
		const { Compilation, sources } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(pluginName, compilation => {
			compilation.hooks.processAssets.tap(
				{ name: pluginName, stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
				() => {
					// Re-read so a watch rebuild sees manifest edits.
					for (const file of ['manifest.json', ...Object.values(readManifest().icons)]) {
						const from = path.join(rootDir, file);

						compilation.fileDependencies.add(from);
						compilation.emitAsset(file, new sources.RawSource(readFileSync(from)));
					}
				},
			);
		});
	},
};

module.exports = {
	mode: 'production',
	entry: './src/content.js',
	output: {
		path: path.join(rootDir, 'dist', 'chrome'),
		filename: bundlePath,
		clean: true,
	},
	plugins: [emitStaticFiles],
};
