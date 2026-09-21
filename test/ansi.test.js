const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { ansiToHtml } = require('../src/ansi');

// Pinned in full: `white-space: pre-line` passes a substring check and silently
// collapses the runs of spaces this rendering exists to keep.
const wrapper = '<div style="background-color: #151516; color: #d1d7dd; font-family: monospace; white-space: pre;">';

const body = html => {
	assert.ok(html.startsWith(wrapper), html.slice(0, wrapper.length));
	assert.ok(html.endsWith('</div>'), html.slice(-32));

	return html.slice(wrapper.length, -'</div>'.length);
};

describe('ansiToHtml', () => {
	test('wraps the log in a preformatted block carrying the theme colours', () => {
		assert.equal(body(ansiToHtml('hello')), 'hello');
	});

	test('renders empty input as an empty block', () => {
		assert.equal(body(ansiToHtml('')), '');
	});

	test('escapes HTML metacharacters in log text', () => {
		assert.equal(
			body(ansiToHtml('<img src=x onerror="alert(1)">')),
			'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
		);
		assert.equal(body(ansiToHtml("& ' <")), '&amp; &apos; &lt;');
	});

	test('converts SGR colour codes to inline styles', () => {
		assert.equal(
			body(ansiToHtml('\u001b[32m+ resource\u001b[0m')),
			'<span style="color:#0A0">+ resource</span>',
		);
	});

	test('converts xterm-256 colour codes to inline styles', () => {
		assert.equal(
			body(ansiToHtml('\u001b[38;5;208morange\u001b[0m')),
			'<span style="color:#ff8700">orange</span>',
		);
		assert.equal(
			body(ansiToHtml('\u001b[48;5;21mblue\u001b[0m')),
			'<span style="background-color:#0000ff">blue</span>',
		);
	});

	test('converts bold to markup', () => {
		assert.equal(body(ansiToHtml('\u001b[1mPlan\u001b[0m')), '<b>Plan</b>');
	});

	test('resets to the theme colours rather than black on white', () => {
		assert.equal(
			body(ansiToHtml('\u001b[31mred\u001b[39m plain')),
			'<span style="color:#A00">red<span style="color:#d1d7dd"> plain</span></span>',
		);
		assert.equal(
			body(ansiToHtml('\u001b[41mred\u001b[49m plain')),
			'<span style="background-color:#A00">red<span style="background-color:#151516"> plain</span></span>',
		);
	});

	test('passes newlines, runs of spaces and tabs through unchanged', () => {
		assert.equal(body(ansiToHtml('a  b\n   c\n\td\n')), 'a  b\n   c\n\td\n');
	});

	test('carries colour across a multi-line run, as a real log does', () => {
		const log = '\u001b[32mTerraform will perform the following actions:\n  + create\u001b[0m';

		assert.equal(
			body(ansiToHtml(log)),
			'<span style="color:#0A0">Terraform will perform the following actions:\n  + create</span>',
		);
	});

	test('closes a colour the log never resets', () => {
		assert.equal(body(ansiToHtml('\u001b[32mgreen')), '<span style="color:#0A0">green</span>');
	});

	test('drops an escape sequence the log truncates', () => {
		assert.equal(body(ansiToHtml('abc\u001b[3')), 'abc');
	});

	test('drops a parameter run long enough to hang the SGR matcher', () => {
		const runaway = '9'.repeat(36);
		const started = Date.now();

		assert.equal(body(ansiToHtml(`before\u001b[${runaway}after`)), 'beforeafter');
		assert.equal(body(ansiToHtml(`\u001b[1;${runaway}`)), '');
		assert.ok(Date.now() - started < 1000, 'conversion is no longer bounded');
	});
});
