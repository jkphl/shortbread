/* eslint strict: ["error", "global"] */

'use strict';

const Vinyl = require('vinyl');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const uglify = require('uglify-js');
const through = require('through2');

const fileProperties = ['history', 'cwd', 'base', 'stat', '_contents'];

/**
 * Test if an object is a vinyl file
 *
 * @param {File|Object} file Vinyl file / object
 * @return {Boolean} Object is a Vinyl file
 */
function isVinylFile(file) {
    if (!file || (typeof file !== 'object')) {
        return false;
    }
    const properties = new Set(Object.getOwnPropertyNames(file));
    if (fileProperties.filter(p => !properties.has(p)).length) {
        return false;
    }
    const content = Object.getOwnPropertyDescriptor(file, '_contents');
    return (typeof content === 'object') && content.writable && content.enumerable && content.configurable;
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

    if (!Array.isArray(val)) {
        if ((typeof val === 'object') && (val.constructor === Object)) {
            ret = Object.keys(val).map(key => val[key]);
        } else {
            ret = [val];
        }
    }

    return ret;
}

/**
 * Convert a value into a list of Vinyl files
 *
 * @param {String|Array|Object} val Value
 * @return {Array} Value list
 */
function makeVinylFileList(val) {
    return makeList(val).filter(v => isVinylFile(v));
}

/**
 * Convert a value into a list of regular expressions
 *
 * @param {String|Array|Object} val Value
 * @return {Array} Regex list
 */
function makeRegexList(val) {
    return makeList(val)
        .filter(v => ((typeof v === 'string' && v.trim().length) || (typeof v === 'object' && v.constructor === RegExp)))
        .map(v => (typeof v === 'string' ? new RegExp(v) : v));
}

/**
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {File|Array.<File>|Object.<String, File>} js [OPTIONAL] JavaScript resource(s)
 * @param {File|Array.<File>|Object.<String, File>} css [OPTIONAL] CSS resource(s)
 * @param {File} critical [OPTIONAL] Critical CSS resource
 * @param {String} slot [OPTIONAL] Cookie slot
 * @param {String} callback [OPTIONAL] Callback(s)
 * @param {Object} config [OPTIONAL] Extended configuration
 */
function shortbread(js, css, critical, slot, callback, config) {
    const jsFiles = makeVinylFileList(js);
    const cssFiles = makeVinylFileList(css);
    const criticalFile = isVinylFile(critical) ? critical : null;
    const cookieSlot = (typeof slot === 'string') ? (slot.trim() || null) : null;
    const options = Object.assign({ prefix: '' }, config || {});
    const callbackString = callback ? JSON.stringify(callback) : 'null';

    if (typeof options.prefix !== 'string') {
        options.prefix = '';
    }

    const result = {
        initial: '',
        subsequent: '',
        resources: [],
        hash: null,
        cookie: `sb${cookieSlot ? `_${cookieSlot}` : ''}`,
    };

    // Return if no resources are given
    if (!jsFiles.length && !cssFiles.length && !criticalFile) {
        return result;
    }

    // 1. Initial head script
    let initial = '';
    if (cssFiles.length) {
        initial += fs.readFileSync(require.resolve('fg-loadcss/src/loadCSS.js'));
        initial += fs.readFileSync(require.resolve('fg-loadcss/src/onloadCSS.js'));
        initial += fs.readFileSync(path.join(__dirname, 'build/cssrelpreload.js'));
    }
    if (jsFiles.length || cssFiles.length) {
        initial += fs.readFileSync(path.join(__dirname, 'build/shortbread.js'));
    }

    // 2. JavaScript resources
    jsFiles.forEach((jsFile) => {
        const resourceHash = shortbread.createHash(jsFile.contents.toString());
        result.resources.push(resourceHash);
        result.initial += `<script src="${options.prefix}${jsFile.relative}" id="${resourceHash}" async defer onload="SHORTBREAD_INSTANCE.loaded(this.id)"></script>`;
        result.subsequent += `<script src="${options.prefix}${jsFile.relative}"></script>`;
    });

    // 3.a Critical CSS
    if (criticalFile) {
        result.initial += `<style>${criticalFile.contents}</style>`;
    }

    let synchronousCSS = '';
    cssFiles.forEach((cssFile) => {
        const resourceHash = shortbread.createHash(cssFile.contents.toString());
        result.resources.push(resourceHash);
        result.initial += `<link rel="preload" href="${options.prefix}${cssFile.relative}" id="${resourceHash}" as="style" onload="this.rel='stylesheet';SHORTBREAD_INSTANCE.loaded(this.id)">`;
        synchronousCSS += `<link rel="stylesheet" href="${options.prefix}${cssFile.relative}">`;
    });
    if (synchronousCSS.length) {
        result.initial += `<noscript>${synchronousCSS}</noscript>`;
        result.subsequent += synchronousCSS;
    }

    // Calculate the master hash
    result.hash = result.resources.length ? shortbread.createHash(result.resources.join('-')) : null;

    if (result.resources.length) {
        initial += `var SHORTBREAD_INSTANCE = new Shortbread(${JSON.stringify(result.resources)}, '${result.hash}', ${JSON.stringify(cookieSlot)}, ${callbackString});`;
    }
    result.initial = `${initial.length ? `<script>"use strict";${uglify.minify(initial, { fromString: true }).code}</script>` : ''}${result.initial}`;
    result.initial = result.initial.split('SHORTBREAD_INSTANCE').join(`sb${result.hash}`);

    return result;
}

/**
 * Streaming interface for shortbread
 *
 * @param {File} critical [OPTIONAL] Critical CSS resource
 * @param {String} slot [OPTIONAL] Cookie slot (optional)
 * @param {String} callback [OPTIONAL] Callback(s)
 * @param {Object} config [OPTIONAL] Extended configuration
 */
shortbread.stream = function stream(critical, slot, callback, config) {
    const options = Object.assign({
        css: ['\\.css$'],
        js: ['\\.js$'],
        prefix: '',
        initial: 'initial.html',
        subsequent: 'subsequent.html',
        data: false,
    }, config || {});
    options.css = makeRegexList(options.css);
    options.js = makeRegexList(options.js);
    options.data = !!options.data;

    // Validate the critical CSS
    if (critical && !isVinylFile(critical)) {
        throw new Error('shortbread.stream: Critical CSS must be a Vinyl object');
    }

    // Prepare the fragment paths
    const cookieSlot = (typeof slot === 'string') ? (slot.trim() || '') : '';
    if (cookieSlot.length) {
        // Prepare the initial page load fragment
        const initialExt = path.extname(options.initial);
        options.initial = `${options.initial.substr(0, options.initial.length - initialExt.length)}.${cookieSlot}${initialExt}`;

        // Prepare the subsequent page load fragment
        const subsequentExt = path.extname(options.subsequent);
        options.subsequent = `${options.subsequent.substr(0, options.subsequent.length - subsequentExt.length)}.${cookieSlot}${subsequentExt}`;
    }

    // Prepare the resource lists
    const js = [];
    const css = [];
    const other = [];

    /**
     * Buffer incoming contents
     *
     * @param {File} file File
     * @param enc
     * @param {Function} cb Callback
     */
    function bufferContents(file, enc, cb) {
        // We don't do streams
        if (file.isStream()) {
            this.emit('error', new Error('shortbread: Streaming not supported'));
            cb();
            return;
        }

        // Detect whether it's a JavaScript resource
        for (const r of options.js) {
            if (file.relative.match(r)) {
                js.push(file);
                cb();
                return;
            }
        }

        // Detect whether it's a CSS resource
        for (const r of options.css) {
            if (file.relative.match(r)) {
                css.push(file);
                cb();
                return;
            }
        }

        other.push(file);
        cb();
    }

    /**
     * End the stream
     *
     * @param {Function} cb Callback
     */
    function endStream(cb) {
        const result = shortbread(js, css, critical, cookieSlot, callback,
            { prefix: options.prefix });

        // If resources have been specified
        if (result.resources.length) {
            // Create the initial page load resource
            this.push(new Vinyl({
                path: options.initial,
                contents: new Buffer(result.initial),
            }));

            // Create the subsequent page load resource
            this.push(new Vinyl({
                path: options.subsequent,
                contents: new Buffer(result.subsequent),
            }));
        }

        other.forEach((file) => {
            const fileWithData = file.clone({
                deep: true,
                contents: true,
            });
            fileWithData.data = result;
            this.push(fileWithData);
        });

        // Create a JSON file with the shortbread result
        if (options.data) {
            this.push(new Vinyl({
                path: `shortbread${cookieSlot ? `.${cookieSlot}` : ''}.json`,
                contents: new Buffer(JSON.stringify(result, null, 4)),
            }));
        }

        cb();
    }

    return through.obj(bufferContents, endStream);
};

/**
 * Create a string hash
 *
 * @param {String} str String
 * @param {Number} length Hash length
 * @return {String} String hash
 */
shortbread.createHash = function createHash(str, length) {
    return crypto.createHash('md5').update(str).digest('hex').substr(0, Math.max(8, parseInt(length || 8, 10)));
};

module.exports = shortbread;
