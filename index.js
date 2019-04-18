/* eslint strict: ["error", "global"] */

/**
 * shortbread is an asynchronous, non-blocking loading pattern for CSS and JavaScript resources
 *
 * @see https://github.com/jkphl/shortbread
 *
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2019 Joschi Kuphal
 * @license MIT https://raw.github.com/jkphl/gulp-cache-bust-meta/master/LICENSE
 */

'use strict';

const Vinyl = require('vinyl');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const uglify = require('uglify-js');
const through = require('through2');
const isUrl = require('is-url');

const fileProperties = ['history', 'stat', '_contents'];

/**
 * Test if an object is a vinyl file
 *
 * @param {File|Object} file Vinyl file / object
 * @return {Boolean} Object is a Vinyl file
 */
function isVinylFile(file) {
    if (Vinyl.isVinyl(file)) {
        return true;
    }
    if (!file || (typeof file !== 'object')) {
        return false;
    }
    const properties = new Set(Object.getOwnPropertyNames(file));
    if ((!properties.has('cwd') && !properties.has('_cwd'))
        || fileProperties.filter(p => !properties.has(p)).length
    ) {
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
 * Convert a value into a list of URLs
 *
 * @param {String|Array|Object} val Value
 * @return {Array} URL list
 */
function makeUrlList(val) {
    return makeList(val).filter(v => isUrl(v));
}

/**
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {File|Array.<File>|Object.<String, File>} js [OPTIONAL] JavaScript resource(s)
 * @param {File|Array.<File>|Object.<String, File>} css [OPTIONAL] CSS resource(s)
 * @param {File|Array.<File>|Object.<File>} critical [OPTIONAL] Critical CSS / JS resource(s)
 * @param {String} slot [OPTIONAL] Cookie slot
 * @param {String} callback [OPTIONAL] Callback(s)
 * @param {Object} config [OPTIONAL] Extended configuration
 */
function shortbread(js, css, critical, slot, callback, config) {
    const jsFiles = makeVinylFileList(js);
    const jsUrls = makeUrlList(js);
    const cssFiles = makeVinylFileList(css);
    const cssUrls = makeUrlList(css);
    const criticalFiles = makeVinylFileList(critical);
    const criticalFilePaths = criticalFiles.map(criticalFile => path.resolve(criticalFile.path));
    const cookieSlot = (typeof slot === 'string') ? (slot.trim() || null) : null;
    const options = Object.assign({
        prefix: '',
        css: ['\\.css$'],
        js: ['\\.js$'],
        debug: false,
    }, config || {});
    const callbackString = callback ? JSON.stringify(callback) : 'null';

    if (typeof options.prefix !== 'string') {
        options.prefix = '';
    }

    let initial = '';
    let needsPrelink = cssFiles.length || cssUrls.length;
    const result = {
        initial: '',
        subsequent: '',
        resources: {},
        hash: null,
        cookie: `sb${cookieSlot ? `_${cookieSlot}` : ''}`,
    };
    const clientResources = {};

    // Return if no resources are given
    if (!jsFiles.length && !jsUrls.length && !cssFiles.length && !cssUrls.length
        && !criticalFiles.length) {
        return result;
    }

    // 1. JavaScript resources
    jsFiles.forEach((jsFile) => {
        const resourceHash = shortbread.createHash(jsFile.contents.toString());
        result.resources[resourceHash] = `${options.prefix}${jsFile.relative}`;

        // If this resource is also registered as critical JavaScript
        if (criticalFilePaths.indexOf(path.resolve(jsFile.path)) >= 0) {
            needsPrelink = true;
            clientResources[resourceHash] = 0;
            result.initial += `<link rel="prefetch" href="${result.resources[resourceHash]}" id="${resourceHash}" as="script" onload="SHORTBREAD_INSTANCE.onloadScript(this)">`;
        } else {
            clientResources[resourceHash] = 1;
            result.initial += `<script src="${result.resources[resourceHash]}" id="${resourceHash}" async defer onreadystatechange="SHORTBREAD_INSTANCE.onloadScript(this)" onload="SHORTBREAD_INSTANCE.onloadScript(this)"></script>`;
        }

        result.subsequent += `<script src="${options.prefix}${jsFile.relative}"></script>`;
    });
    jsUrls.forEach((jsUrl) => {
        const resourceHash = shortbread.createHash(jsUrl);
        result.resources[resourceHash] = jsUrl;
        clientResources[resourceHash] = 1;
        result.initial += `<script src="${jsUrl}" id="${resourceHash}" async defer onreadystatechange="SHORTBREAD_INSTANCE.onloadScript(this)" onload="SHORTBREAD_INSTANCE.onloadScript(this)"></script>`;
        result.subsequent += `<script src="${jsUrl}"></script>`;
    });

    // 2.a Critical CSS & JavaScript
    criticalFiles.forEach((criticalFile) => {
        // Detect whether it's a JavaScript resource
        for (const r of options.js) {
            if (criticalFile.relative.match(r)) {
                result.initial += `<script>${criticalFile.contents}</script>`;
                return;
            }
        }

        // Detect whether it's a CSS resource
        for (const r of options.css) {
            if (criticalFile.relative.match(r)) {
                result.initial += `<style>${criticalFile.contents}</style>`;
                return;
            }
        }
    });

    // 3. Initial head script
    if (needsPrelink) {
        initial += fs.readFileSync(require.resolve('prelink/build/prelink.min.js'));
    }
    if (jsFiles.length || jsUrls.length || needsPrelink) {
        initial += fs.readFileSync(path.join(__dirname, `build/shortbread${options.debug ? '.debug' : ''}.js`));
    }

    let synchronousCSS = '';
    cssFiles.forEach((cssFile) => {
        const resourceHash = shortbread.createHash(cssFile.contents.toString());
        result.resources[resourceHash] = `${options.prefix}${cssFile.relative}`;
        clientResources[resourceHash] = 1;
        result.initial += `<link rel="preload" href="${result.resources[resourceHash]}" id="${resourceHash}" as="style" onload="this.rel='stylesheet';SHORTBREAD_INSTANCE.loaded(this.id)">`;
        synchronousCSS += `<link rel="stylesheet" href="${result.resources[resourceHash]}">`;
    });
    cssUrls.forEach((cssUrl) => {
        const resourceHash = shortbread.createHash(cssUrl);
        result.resources[resourceHash] = cssUrl;
        clientResources[resourceHash] = 1;
        result.initial += `<link rel="preload" href="${cssUrl}" id="${resourceHash}" as="style" onload="this.rel='stylesheet';SHORTBREAD_INSTANCE.loaded(this.id)">`;
        synchronousCSS += `<link rel="stylesheet" href="${cssUrl}">`;
    });
    if (synchronousCSS.length) {
        result.initial += `<noscript>${synchronousCSS}</noscript>`;
        result.subsequent += synchronousCSS;
    }

    // Calculate the master hash
    const resourceHashes = Object.keys(result.resources);
    result.hash = resourceHashes.length ? shortbread.createHash(resourceHashes.join('-')) : null;

    if (resourceHashes.length) {
        initial += `var SHORTBREAD_INSTANCE = new Shortbread(${JSON.stringify(clientResources)}, '${result.hash}', ${JSON.stringify(cookieSlot)}, ${callbackString});`;
    }
    result.initial = `${initial.length ? `<script>"use strict";${uglify.minify(initial).code}</script>` : ''}${result.initial}`;
    result.initial = result.initial.split('SHORTBREAD_INSTANCE').join(`sb${result.hash}`);

    return result;
}

/**
 * Streaming interface for shortbread
 *
 * @param {File|Array.<File>|Object.<File>} critical    [OPTIONAL] Critical CSS / JS resource(s)
 * @param {String} slot                                 [OPTIONAL] Cookie slot (optional)
 * @param {String} callback                             [OPTIONAL] Callback(s)
 * @param {Object} config                               [OPTIONAL] Extended configuration
 */
shortbread.stream = function stream(critical, slot, callback, config) {
    const options = Object.assign({
        css: ['\\.css$'],
        cssUrl: [],
        js: ['\\.js$'],
        jsUrl: [],
        prefix: '',
        initial: 'initial.html',
        subsequent: 'subsequent.html',
        data: false,
    }, config || {});
    options.css = makeRegexList(options.css);
    options.js = makeRegexList(options.js);
    options.data = !!options.data;

    // Validate the critical CSS or JavaScript resource(s)
    if (critical && !makeVinylFileList(critical).length) {
        throw new Error('shortbread.stream: Critical resources must be single a Vinyl object, a Vinyl object array or object');
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
    const js = options.jsUrl;
    const css = options.cssUrl;
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
        const result = shortbread(
            js,
            css,
            critical,
            cookieSlot,
            callback,
            {
                prefix: options.prefix,
                css: options.css,
                js: options.js,
            });

        // If resources have been specified
        if (Object.keys(result.resources).length) {
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
        })
        ;

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
