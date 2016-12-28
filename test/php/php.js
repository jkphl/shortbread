const path = require('path');
const shortbread = require('../..');
const vinyl = require('vinyl-file');
const fs = require('fs-extra');
const handlebars = require('handlebars');

// Prepare the output directory
fs.mkdirsSync(path.join(__dirname, '../tmp'));

const criticalCSS = vinyl.readSync(path.join(__dirname, '../fixtures/critical.css'));
const script = vinyl.readSync(path.join(__dirname, '../fixtures/script.js'));
script.path = `${script.base}/index.php?asset=script.js`;
const js = [script];
const style = vinyl.readSync(path.join(__dirname, '../fixtures/style.css'));
style.path = `${style.base}/index.php?asset=style.css`;
const css = [style];
const result = shortbread(js, css, criticalCSS, 'main', 'allLoaded');

// Compile and store the PHP test file
const hbs = fs.readFileSync(path.join(__dirname, 'index.hbs'));
const template = handlebars.compile(hbs.toString());
const php = template(result);
fs.mkdirsSync(path.join(__dirname, '../../tmp'));
fs.writeFileSync(path.join(__dirname, '../../tmp/index.php'), php);
