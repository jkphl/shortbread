const vinyl = require('vinyl');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const uglify = require('uglify-js');

/**
 * Create a string hash
 *
 * @param {String} str String
 * @param {Number} length Hash length
 * @return {String} String hash
 */
function createHash(str, length = 8) {
    return crypto.createHash('md5').update(str).digest('hex').substr(0, Math.max(8, length || 0));
}

/**
 * Convert a value into a value list
 *
 * @param {String|Array|Object} val Value
 * @return {Array} Value list
 */
function makeList(val) {
    if (val === null) {
        return [];
    }
    let ret = val;

    if (typeof val === 'object') {
        if (val.constructor !== Array) {
            ret = Object.keys(val).map(key => val[key]);
        }
    } else {
        ret = [val];
    }

    return ret;
}

/**
 * Convert a value into a list of non-empty string values
 *
 * @param {String|Array|Object} val Value
 * @return {Array} Value list
 */
function makeVinylFileList(val) {
    return makeList(val).filter(v => vinyl.isVinyl(v) && !v.isNull());
}

/**
 * Convert a value into a list of functions
 *
 * @param {String|Array|Object} val Value
 * @return {Array} Function list
 */
function makeFunctionList(val) {
    return makeList(val).filter(v => typeof v === 'function');
}

/**
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {String|Array|Object} js JavaScript resource(s)
 * @param {String|Array|Object} css CSS resource(s)
 * @param {File} critical Critical CSS resource
 * @param {Function|Array|Object} callback Callback(s)
 */
function shortbread(js = [], css = [], critical = null, callback = null) {
    const jsFiles = makeVinylFileList(js);
    const cssFiles = makeVinylFileList(css);
    const criticalFile = (vinyl.isVinyl(critical) && !critical.isNull()) ? critical : null;
    const callbacks = makeFunctionList(callback);
    const resources = {};
    const result = {initial: '', successive: ''};

    // 1. Initial head script
    let initial = '/* loader script */';
    initial += fs.readFileSync(path.join(__dirname, 'node_modules/fg-loadcss/src/loadCSS.js'));
    initial += fs.readFileSync(path.join(__dirname, 'node_modules/fg-loadcss/src/onloadCSS.js'));
    result.initial = `<script>${uglify.minify(initial, {fromString: true}).code}</script>`;

    // 2. JavaScript resources
    jsFiles.forEach((jsFile) => {
        const resourceHash = createHash(jsFile.contents.toString());
        resources[resourceHash] = true;
        result.initial += `<script src="${jsFile.relative}" id="${resourceHash}" async defer onload="shortbread.loaded(this.id)"></script>`;
        result.successive += `<script src="${jsFile.relative}" async defer></script>`;
    });

    // 3.a Critical CSS
    if (criticalFile) {
        result.initial += `<style>${criticalFile.contents}</style>`;
    }

    let synchronousCSS = '';
    cssFiles.forEach((cssFile) => {
        const resourceHash = createHash(cssFile.contents.toString());
        result.initial += `<link rel="preload" href="${cssFile.relative}" id="${resourceHash}" as="style" onload="this.rel='stylesheet';shortbread.loaded(this.id)">`;
        synchronousCSS += `<link rel="stylesheet" href="${cssFile.relative}">`;
    });
    result.successive += synchronousCSS;

    const cssrelpreload = fs.readFileSync(path.join(__dirname, 'build/cssrelpreload.js'));
    result.initial += `<script>${cssrelpreload}</script>`;
    result.initial += `<noscript>${synchronousCSS}</noscript>`;
    console.log(result);
}

module.exports = shortbread;
