const Convert = require('ansi-to-html');

const color = '#d1d7dd';
const bgColor = '#151516';

// escapeXML makes the innerHTML assignment in content.js safe: log text is
// arbitrary. fg and bg are what the SGR 39 and 49 reset codes resolve to.
const convert = new Convert({ escapeXML: true, fg: color, bg: bgColor });

const style = `background-color: ${bgColor}; color: ${color}; font-family: monospace; white-space: pre;`;

// eslint-disable-next-line no-control-regex -- matching the escape character is the point
const parameters = /\u001b\[[\d;]*/g;
const runaway = /\d{8}/;

// ansi-to-html matches SGR parameters with a nested quantifier, which backtracks
// exponentially over a long digit run that no `m` terminates: a few dozen bytes
// of log hang the page. No real parameter runs past three digits.
const dropRunawayParameters = ansi => ansi.replace(parameters, csi => runaway.test(csi) ? '' : csi);

const ansiToHtml = ansi => `<div style="${style}">${convert.toHtml(dropRunawayParameters(ansi))}</div>`;

module.exports = { ansiToHtml, bgColor };
