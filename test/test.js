const path = require('path');
const shortbread = require('..');
const vinyl = require('vinyl-file');

const criticalCSS = vinyl.readSync(path.join(__dirname, 'critical.css'));
const js = [
    vinyl.readSync(path.join(__dirname, 'script1.js')),
    vinyl.readSync(path.join(__dirname, 'script2.js')),
    'invalid'
];
const css = [
    vinyl.readSync(path.join(__dirname, 'styles1.css')),
    vinyl.readSync(path.join(__dirname, 'styles2.css')),
    'invalid'
];

const result = shortbread(js, css, criticalCSS);
console.log(JSON.stringify(result, null, 4));
