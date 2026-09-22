const { ansiToHtml, bgColor } = require('./ansi');

// textContent rather than innerText: innerText lays the raw log out first,
// and that layout is thrown away with the raw log.
document.body.innerHTML = ansiToHtml(document.body.textContent);
// The wrapper is only as tall as the log, so the body shows through beneath it.
document.body.style.backgroundColor = bgColor;
