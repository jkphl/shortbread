const path = require('path');
const shortbread = require('..');
const vinyl = require('vinyl-file');
const fs = require('fs-extra');
const handlebars = require('handlebars');

// Prepare the output directory
fs.mkdirsSync(path.join(__dirname, '../tmp'));

const criticalCSS = vinyl.readSync(path.join(__dirname, 'fixtures/critical.css'));
const script1 = vinyl.readSync(path.join(__dirname, 'fixtures/script1.js'));
script1.path = `${script1.base}/index.php?asset=script1.js`;
const js = [script1];
const style1 = vinyl.readSync(path.join(__dirname, 'fixtures/style1.css'));
style1.path = `${style1.base}/index.php?asset=style1.css`;
const css = [style1];
const result = shortbread(js, css, criticalCSS, 'main', 'allLoaded');

// Compile and store the PHP test file
const hbs = fs.readFileSync(path.join(__dirname, 'index.hbs'));
const template = handlebars.compile(hbs.toString());
const php = template(result);
fs.writeFileSync(path.join(__dirname, '../tmp/index.php'), php);
