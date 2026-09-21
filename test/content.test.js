const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, test } = require('node:test');

const manifest = require('../manifest.json');

// The built bundle rather than src/, so this covers what the browser runs.
const bundle = path.join(__dirname, '..', 'dist', 'chrome', manifest.content_scripts[0].js[0]);

describe('the content script', () => {
	test('replaces the raw log with the escaped rendering', () => {
		const log = 'plain\n\u001b[32m  + create\u001b[0m\n<img src=x onerror=alert(1)>';

		global.document = { body: { innerText: log, innerHTML: null, style: {} } };
		require(bundle);

		const { innerHTML, style } = global.document.body;

		assert.ok(innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), innerHTML);
		assert.ok(!innerHTML.includes('<img'), innerHTML);
		assert.ok(innerHTML.includes('<span style="color:#0A0">  + create</span>'), innerHTML);
		assert.equal(style.backgroundColor, '#151516');
	});
});
