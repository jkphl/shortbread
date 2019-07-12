/* eslint-disable no-param-reassign */
/* eslint-disable no-console */

/**
 * shortbread is an asynchronous, non-blocking loading pattern for CSS and JavaScript resources
 *
 * @see https://github.com/jkphl/shortbread
 *
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2019 Joschi Kuphal
 * @license MIT https://raw.github.com/jkphl/gulp-cache-bust-meta/master/LICENSE
 */

/**
 * Shortbread constructor
 *
 * @param {Object} resources Expected resources
 * @param {String} master Master hash
 * @param {String} slot Cookie slot
 * @param {Function|String} callback Callback (name)
 */
function Shortbread() {
    var resources = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var master = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var slot = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var callback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    /**
     * Expected resources
     *
     * @type {Object}
     */
    this.res = resources;
    /**
     * Master hash / cookie value
     *
     * @type {String}
     */
    this.hash = master || null;
    /**
     * Cookie slot
     *
     * @type {String}
     */
    this.slot = slot || null;
    /**
     * Callback function
     *
     * @type {Function|String}
     */
    this.cb = callback;
    /**
     * Completion indicator
     *
     * @type {Boolean}
     */
    this.complete = false;

    // Debug all registered resources
    console.debug('Registered ' + Object.values(resources).length + ' resource(s)', resources);
}

/**
 * Register a loaded script
 *
 * @param {Element} script Script element
 */
Shortbread.prototype.onloadScript = function onloadScript(script) {
    if (!script.readyState || script.readyState === 'complete') {
        script.onload = script.onreadystatechange = null;
        this.loaded(script.id);
    }
};

/**
 * Register a loaded resource
 *
 * @param {string} resourceId Resource ID
 */
Shortbread.prototype.loaded = function loaded(resourceId) {
    var required = 0;
    var res = {};
    for (var r in this.res) {
        if (r !== resourceId) {
            required += res[r] = this.res[r];
        }
    }
    console.debug('Loaded resource ' + resourceId + ': ' + (Object.values(res).length < Object.values(this.res).length ? 'OK' : 'FAILED'));
    console.debug('Waiting for another ' + required + ' required resource(s)', res);
    this.res = res;

    // If all expected resources have been loaded
    if (!this.complete && !required) {
        this.complete = true;

        // If a cookie should be set
        if (this.hash) {
            var expires = new Date(+new Date() + 604800000).toUTCString();
            var cookie = 'sb' + (this.slot ? '_' + this.slot : '');
            document.cookie = cookie + '=' + this.hash + ';path=/;expires=' + expires;
            console.debug('Setting shortbread cookie');
        }

        // Look for a callback to be run
        if (typeof this.cb === 'string' && this.cb.length && this.cb in window && typeof window[this.cb] === 'function') {
            this.cb = window[this.cb];
        }
        if (typeof this.cb === 'function') {
            console.debug('Triggering callback');
            this.cb();
        }
    }
};