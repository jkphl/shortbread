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
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {String|Array|Object} js JavaScript resource(s)
 * @param {String|Array|Object} css CSS resource(s)
 * @param {File} critical Critical CSS resource
 * @param {String} slot Cookie slot
 * @param {Function|Array|Object} callback Callback(s)
 */
function shortbread(js = [], css = [], critical = null, slot = null, callback = null) {
    const jsFiles = makeVinylFileList(js);
    const cssFiles = makeVinylFileList(css);
    const criticalFile = (vinyl.isVinyl(critical) && !critical.isNull()) ? critical : null;
    const cookieSlot = (typeof slot === 'string') ? (slot.trim() || null) : null;
    const result = {
        initial: '',
        successive: '',
        resources: [],
        hash: null,
        cookie: `sb${cookieSlot ? `_${cookieSlot}` : ''}`,
    };

    // 1. Initial head script
    let initial = '"use strict";';
    initial += fs.readFileSync(path.join(__dirname, 'node_modules/fg-loadcss/src/loadCSS.js'));
    initial += fs.readFileSync(path.join(__dirname, 'node_modules/fg-loadcss/src/onloadCSS.js'));
    initial += fs.readFileSync(path.join(__dirname, 'build/cssrelpreload.js'));
    initial += fs.readFileSync(path.join(__dirname, 'build/shortbread.js'));

    // 2. JavaScript resources
    jsFiles.forEach((jsFile) => {
        const resourceHash = createHash(jsFile.contents.toString());
        result.resources.push(resourceHash);
        result.initial += `<script src="${jsFile.relative}" id="${resourceHash}" async defer onload="SHORTBREAD_INSTANCE.loaded(this.id)"></script>`;
        result.successive += `<script src="${jsFile.relative}" async defer></script>`;
    });

    // 3.a Critical CSS
    if (criticalFile) {
        result.initial += `<style>${criticalFile.contents}</style>`;
    }

    let synchronousCSS = '';
    cssFiles.forEach((cssFile) => {
        const resourceHash = createHash(cssFile.contents.toString());
        result.resources.push(resourceHash);
        result.initial += `<link rel="preload" href="${cssFile.relative}" id="${resourceHash}" as="style" onload="this.rel='stylesheet';SHORTBREAD_INSTANCE.loaded(this.id)">`;
        synchronousCSS += `<link rel="stylesheet" href="${cssFile.relative}">`;
    });
    result.initial += `<noscript>${synchronousCSS}</noscript>`;
    result.successive += synchronousCSS;

    // Calculate the master hash
    result.hash = result.resources.length ? createHash(result.resources.join('-')) : null;

    if (result.resources.length) {
        initial += `var SHORTBREAD_INSTANCE = new Shortbread(${JSON.stringify(result.resources)}, '${result.hash}', ${JSON.stringify(cookieSlot)}, ${JSON.stringify(callback)});`;
    }
    result.initial = `<script>${uglify.minify(initial, { fromString: true }).code}</script>${result.initial}`;
    result.initial = result.initial.split('SHORTBREAD_INSTANCE').join(`sb${result.hash}`);

    return result;
}

module.exports = shortbread;
