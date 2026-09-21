const { ansiToHtml, bgColor } = require('./ansi');

const log = document.body.innerText;
document.body.innerHTML = ansiToHtml(log);
// The wrapper is only as tall as the log, so the body shows through beneath it.
document.body.style.backgroundColor = bgColor;
