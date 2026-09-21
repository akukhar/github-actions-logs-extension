const Convert = require('ansi-to-html');

const color = '#d1d7dd';
const bgColor = '#151516';

// escapeXML makes the innerHTML assignment in content.js safe: log text is
// arbitrary. fg and bg are what the SGR 39 and 49 reset codes resolve to.
const convert = new Convert({ escapeXML: true, fg: color, bg: bgColor });

const ansiToHtml = (ansi) => {
	const lines = ansi.split('\n');
	const converted = lines.map(l => {
		// We also replace consecutive spaces by `&nbsp;` otherwise they won't
		// be displayed.
		return convert.toHtml(l).replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));
	});
	
	return '<div style="background-color: ' + bgColor + '; color: ' + color + '; font-family: monospace; white-space: nowrap;">' + converted.join('<br/>') + '</div>';
}

module.exports = { ansiToHtml, bgColor };
