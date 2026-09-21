const Convert = require('ansi-to-html');

const color = '#d1d7dd';
const bgColor = '#151516';

// escapeXML makes the innerHTML assignment in content.js safe: log text is
// arbitrary. fg and bg are what the SGR 39 and 49 reset codes resolve to.
const convert = new Convert({ escapeXML: true, fg: color, bg: bgColor });

const style = `background-color: ${bgColor}; color: ${color}; font-family: monospace; white-space: pre;`;

const ansiToHtml = ansi => `<div style="${style}">${convert.toHtml(ansi)}</div>`;

module.exports = { ansiToHtml, bgColor };
