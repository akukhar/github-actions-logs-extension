const color = '#d1d7dd';
const bgColor = '#151516';
const linesPerChunk = 256;

const style = `background-color: ${bgColor}; color: ${color}; font-family: monospace; white-space: pre;`;

// The 16 named colours are the ones ansi-to-html rendered, so a log looks as
// it did; the 6x6x6 cube and the grey ramp are xterm's.
const hex = n => n.toString(16).padStart(2, '0');
const palette = ['#000', '#A00', '#0A0', '#A50', '#00A', '#A0A', '#0AA', '#AAA', '#555', '#F55', '#5F5', '#FF5', '#55F', '#F5F', '#5FF', '#FFF'];

for (let i = 16; i < 232; i += 1) {
	const cube = i - 16;
	const channel = level => level > 0 ? level * 40 + 55 : 0;

	palette.push(`#${hex(channel(Math.floor(cube / 36)))}${hex(channel(Math.floor(cube / 6) % 6))}${hex(channel(cube % 6))}`);
}

for (let i = 232; i < 256; i += 1) {
	const grey = hex((i - 232) * 10 + 8);

	palette.push(`#${grey}${grey}${grey}`);
}

const rgb = (r, g, b) => [r, g, b].every(v => v >= 0 && v <= 255) ? `#${hex(r)}${hex(g)}${hex(b)}` : undefined;

const reset = s => {
	s.fg = '';
	s.bg = '';
	s.bold = false;
	s.dim = false;
	s.italic = false;
	s.underline = false;
	s.strike = false;

	return s;
};

const css = s => {
	const parts = [];

	if (s.fg) parts.push(`color:${s.fg}`);
	if (s.bg) parts.push(`background-color:${s.bg}`);
	if (s.bold) parts.push('font-weight:bold');
	if (s.dim) parts.push('opacity:.6');
	if (s.italic) parts.push('font-style:italic');
	if (s.underline || s.strike) parts.push(`text-decoration:${[s.underline && 'underline', s.strike && 'line-through'].filter(Boolean).join(' ')}`);

	return parts.join(';');
};

const between = (c, low, high) => c >= low && c <= high;

// Applies the SGR parameters in text[start, end) to the state. Unknown codes
// are ignored. This runs for every sequence in the log, so the parameters are
// read in place into one reused array rather than split into strings.
const codes = [];
const sgr = (text, start, end, s) => {
	let code = 0;

	codes.length = 0;
	for (let i = start; i <= end; i += 1) {
		const c = i < end ? text.charCodeAt(i) : 0x3b;

		if (c === 0x3b) {
			codes.push(code);
			code = 0;
		} else if (between(c, 0x30, 0x39)) {
			code = code * 10 + c - 0x30;
		} else {
			code = NaN;
		}
	}

	for (let i = 0; i < codes.length; i += 1) {
		const code = codes[i];

		if (code === 0) reset(s);
		else if (code === 1) s.bold = true;
		else if (code === 2) s.dim = true;
		else if (code === 3) s.italic = true;
		else if (code === 4) s.underline = true;
		else if (code === 9) s.strike = true;
		else if (code === 22) { s.bold = false; s.dim = false; }
		else if (code === 23) s.italic = false;
		else if (code === 24) s.underline = false;
		else if (code === 29) s.strike = false;
		else if (between(code, 30, 37)) s.fg = palette[code - 30];
		else if (code === 39) s.fg = '';
		else if (between(code, 40, 47)) s.bg = palette[code - 40];
		else if (code === 49) s.bg = '';
		else if (between(code, 90, 97)) s.fg = palette[code - 82];
		else if (between(code, 100, 107)) s.bg = palette[code - 92];
		else if (code === 38 || code === 48) {
			const key = code === 38 ? 'fg' : 'bg';

			if (codes[i + 1] === 5) {
				s[key] = palette[codes[i + 2]] ?? s[key];
				i += 2;
			} else if (codes[i + 1] === 2) {
				s[key] = rgb(codes[i + 2], codes[i + 3], codes[i + 4]) ?? s[key];
				i += 4;
			} else {
				break;
			}
		}
	}

	s.dirty = true;
};

// Returns the index just past the escape sequence at `at`, applying it to the
// state when it is an SGR. Everything else is dropped whole: other CSIs, an
// OSC up to its terminator, ESC plus one byte, and a CSI that the end of the
// log, a newline or another escape cuts off before its final byte.
const skipSequence = (text, at, s) => {
	const kind = text.charCodeAt(at + 1);

	if (kind === 0x5b) {
		let i = at + 2;

		while (between(text.charCodeAt(i), 0x30, 0x3f)) i += 1;
		const parametersEnd = i;

		while (between(text.charCodeAt(i), 0x20, 0x2f)) i += 1;
		const final = text.charCodeAt(i);

		if (final === 0x6d) sgr(text, at + 2, parametersEnd, s);

		return between(final, 0x40, 0x7e) ? i + 1 : i;
	}

	if (kind === 0x5d) {
		let i = at + 2;

		while (i < text.length && text.charCodeAt(i) !== 0x07 && text.charCodeAt(i) !== 0x1b) i += 1;
		if (text.charCodeAt(i) === 0x07) return i + 1;

		return text.charCodeAt(i + 1) === 0x5c ? i + 2 : i;
	}

	let i = at + 1;

	while (between(text.charCodeAt(i), 0x20, 0x2f)) i += 1;

	return between(text.charCodeAt(i), 0x30, 0x7e) ? i + 1 : i;
};

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escape = text => text.replace(/[&<>]/g, c => entities[c]);

// Renders one piece of the log, carrying the SGR state in and out so a colour
// can span chunks. Adjacent runs with the same style share one span, and the
// style is only computed when text needs it: most sequences follow another.
const render = (text, s) => {
	const parts = [];
	let open = '';
	let from = 0;
	const emit = to => {
		if (s.dirty) {
			s.css = css(s);
			s.dirty = false;
		}
		if (s.css !== open) {
			if (open) parts.push('</span>');
			if (s.css) parts.push(`<span style="${s.css}">`);
			open = s.css;
		}
		parts.push(escape(text.slice(from, to)));
	};

	for (let at = text.indexOf('\u001b'); at >= 0; at = text.indexOf('\u001b', from)) {
		if (at > from) emit(at);
		from = skipSequence(text, at, s);
	}
	if (from < text.length) emit(text.length);
	if (open) parts.push('</span>');

	return parts.join('');
};

// Each chunk is laid out and painted only near the viewport. The estimate is
// exact for unwrapped lines, so the scrollbar is right before anything renders.
// max-content keeps long lines from being clipped by the paint containment.
const chunk = (lines, html) => `<div style="content-visibility:auto;contain-intrinsic-block-size:auto ${lines}lh;width:max-content">${html}</div>`;

const ansiToHtml = (log, chunkLines = linesPerChunk) => {
	const s = reset({ css: '', dirty: false });
	let html = `<div style="${style}">`;

	for (let start = 0; start < log.length;) {
		let end = start;
		let lines = 0;

		while (lines < chunkLines && end < log.length) {
			const newline = log.indexOf('\n', end);

			end = newline < 0 ? log.length : newline + 1;
			lines += 1;
		}
		html += chunk(lines, render(log.slice(start, end), s));
		start = end;
	}

	return `${html}</div>`;
};

module.exports = { ansiToHtml, bgColor };
