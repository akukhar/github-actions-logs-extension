const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { ansiToHtml } = require('../src/ansi');

// Pinned in full: `white-space: pre-line` passes a substring check and silently
// collapses the runs of spaces this rendering exists to keep.
const wrapper = '<div style="background-color: #151516; color: #d1d7dd; font-family: monospace; white-space: pre;">';
const chunk = lines => `<div style="content-visibility:auto;contain-intrinsic-block-size:auto ${lines}lh;width:max-content">`;

// The inside of a log that fits one chunk.
const body = (html, lines = 1) => {
	const open = wrapper + chunk(lines);

	assert.ok(html.startsWith(open), html.slice(0, open.length));
	assert.ok(html.endsWith('</div></div>'), html.slice(-32));

	return html.slice(open.length, -'</div></div>'.length);
};

describe('ansiToHtml', () => {
	test('wraps the log in a preformatted block carrying the theme colours', () => {
		assert.equal(body(ansiToHtml('hello')), 'hello');
	});

	test('renders empty input as an empty block', () => {
		assert.equal(ansiToHtml(''), `${wrapper}</div>`);
	});

	test('escapes HTML metacharacters in log text', () => {
		assert.equal(body(ansiToHtml('<img src=x onerror="alert(1)">')), '&lt;img src=x onerror="alert(1)"&gt;');
		assert.equal(body(ansiToHtml("& ' <")), "&amp; ' &lt;");
	});

	test('converts SGR colour codes to inline styles', () => {
		assert.equal(body(ansiToHtml('\u001b[32m+ resource\u001b[0m')), '<span style="color:#0A0">+ resource</span>');
		assert.equal(body(ansiToHtml('\u001b[41;97mwarn\u001b[0m')), '<span style="color:#FFF;background-color:#A00">warn</span>');
	});

	test('converts xterm-256 colour codes to inline styles', () => {
		assert.equal(body(ansiToHtml('\u001b[38;5;208morange\u001b[0m')), '<span style="color:#ff8700">orange</span>');
		assert.equal(body(ansiToHtml('\u001b[48;5;21mblue\u001b[0m')), '<span style="background-color:#0000ff">blue</span>');
		assert.equal(body(ansiToHtml('\u001b[0;38;5;95mpath\u001b[0m')), '<span style="color:#875f5f">path</span>');
	});

	test('converts truecolor codes to inline styles', () => {
		assert.equal(body(ansiToHtml('\u001b[38;2;255;136;0mboth\u001b[0m')), '<span style="color:#ff8800">both</span>');
		assert.equal(body(ansiToHtml('\u001b[38;2;300;0;0mout of range\u001b[0m')), 'out of range');
	});

	test('converts text attributes to inline styles', () => {
		assert.equal(body(ansiToHtml('\u001b[1mPlan\u001b[0m')), '<span style="font-weight:bold">Plan</span>');
		assert.equal(body(ansiToHtml('\u001b[1;31mError\u001b[0m')), '<span style="color:#A00;font-weight:bold">Error</span>');
		assert.equal(body(ansiToHtml('\u001b[2mdim\u001b[22m plain')), '<span style="opacity:.6">dim</span> plain');
		assert.equal(
			body(ansiToHtml('\u001b[3;4;9mall\u001b[23;24;29m plain')),
			'<span style="font-style:italic;text-decoration:underline line-through">all</span> plain',
		);
	});

	test('leaves concealed text readable', () => {
		assert.equal(body(ansiToHtml('\u001b[8msecret\u001b[28m')), 'secret');
	});

	test('resets to the theme colours by inheritance', () => {
		assert.equal(body(ansiToHtml('\u001b[31mred\u001b[39m plain')), '<span style="color:#A00">red</span> plain');
		assert.equal(body(ansiToHtml('\u001b[41mred\u001b[49m plain')), '<span style="background-color:#A00">red</span> plain');
	});

	test('passes newlines, runs of spaces and tabs through unchanged', () => {
		assert.equal(body(ansiToHtml('a  b\n   c\n\td\n'), 3), 'a  b\n   c\n\td\n');
	});

	test('carries colour across a multi-line run, as a real log does', () => {
		const log = '\u001b[32mTerraform will perform the following actions:\n  + create\u001b[0m';

		assert.equal(
			body(ansiToHtml(log), 2),
			'<span style="color:#0A0">Terraform will perform the following actions:\n  + create</span>',
		);
	});

	test('closes a colour the log never resets', () => {
		assert.equal(body(ansiToHtml('\u001b[32mgreen')), '<span style="color:#0A0">green</span>');
	});

	test('merges adjacent runs that share a style', () => {
		assert.equal(body(ansiToHtml('\u001b[90mtime\u001b[0m\u001b[90mstamp\u001b[0m')), '<span style="color:#555">timestamp</span>');
	});

	test('splits the log into chunks that carry their line count and reopen the style', () => {
		assert.equal(
			ansiToHtml('\u001b[32ma\nb\nc', 1),
			`${wrapper}${chunk(1)}<span style="color:#0A0">a\n</span></div>${chunk(1)}<span style="color:#0A0">b\n</span></div>${chunk(1)}<span style="color:#0A0">c</span></div></div>`,
		);
		assert.equal(ansiToHtml('a\nb\n', 256), `${wrapper}${chunk(2)}a\nb\n</div></div>`);
	});

	test('drops escape sequences other than SGR whole', () => {
		assert.equal(body(ansiToHtml('\u001b[2J\u001b[Kabc\u001b[1000Dxyz\u001b[?25l')), 'abcxyz');
		assert.equal(body(ansiToHtml('\u001b]8;;https://example.com\u001b\\link\u001b]8;;\u001b\\ \u001b]0;title\u0007')), 'link ');
		assert.equal(body(ansiToHtml('\u001b(Btext\u001b=')), 'text');
	});

	test('drops a sequence the log truncates or interrupts, as a terminal does', () => {
		assert.equal(body(ansiToHtml('abc\u001b[3')), 'abc');
		assert.equal(body(ansiToHtml('abc\u001b')), 'abc');
		assert.equal(body(ansiToHtml('a\u001b[0\u001b[32mb')), 'a<span style="color:#0A0">b</span>');
		assert.equal(body(ansiToHtml('x\u001b[3\ny'), 2), 'x\ny');
	});

	test('stays linear on a parameter run long enough to hang a backtracking matcher', () => {
		const runaway = '9'.repeat(100000);
		const started = Date.now();

		assert.equal(body(ansiToHtml(`before\u001b[${runaway}mafter`)), 'beforeafter');
		assert.equal(ansiToHtml(`\u001b[1;${runaway}`), `${wrapper}${chunk(1)}</div></div>`);
		assert.ok(Date.now() - started < 1000, 'conversion is no longer bounded');
	});
});
