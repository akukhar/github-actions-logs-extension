const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');

const distDir = path.join(__dirname, '..', 'dist');
const manifestOf = build => JSON.parse(readFileSync(path.join(distDir, build, 'manifest.json'), 'utf8'));

describe('the built extensions', () => {
	test('ship every file their manifests declare', () => {
		for (const build of ['chrome', 'firefox']) {
			const manifest = manifestOf(build);
			const declared = [
				...manifest.content_scripts.flatMap(script => script.js),
				...Object.values(manifest.icons),
			];

			assert.ok(declared.length > 0, `${build} declares no files`);

			for (const file of declared) {
				assert.ok(existsSync(path.join(distDir, build, file)), `${build}/${file}`);
			}
		}
	});

	test('run on the log hosts and nowhere else', () => {
		assert.deepEqual(manifestOf('chrome').content_scripts.flatMap(script => script.matches), [
			'https://pipelines.actions.githubusercontent.com/serviceHosts/*',
			'https://*.actions.githubusercontent.com/*',
			'https://cdn.artifacts.gitlab-static.net/*',
			'https://*.windows.net/actions-results/*',
		]);
	});

	test('keep the AMO listing identity on the Firefox build', () => {
		assert.deepEqual(manifestOf('firefox').browser_specific_settings.gecko, {
			id: 'net.cozic.plugins.GitHubRawActionLogViewer@nospam',
			data_collection_permissions: { required: ['none'] },
		});
	});

	test('differ only in those Firefox settings', () => {
		const { browser_specific_settings: gecko, ...firefox } = manifestOf('firefox');

		assert.ok(gecko);
		assert.deepEqual(firefox, manifestOf('chrome'));
	});
});
