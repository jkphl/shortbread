/* eslint-disable no-param-reassign */

/**
 * Shortbread constructor
 *
 * @param {Array} resources Expected resources
 * @param {String} master Master hash
 * @param {String} slot Cookie slot
 * @param {Function|String} callback Callback (name)
 */
function Shortbread(resources = [], master = null, slot = null, callback = null) {
    /**
     * Expected resources
     *
     * @type {Array}
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
    const res = [];
    let r = 0;
    for (; r < this.res.length; ++r) {
        if (this.res[r] !== resourceId) {
            res.push(this.res[r]);
        }
    }
    this.res = res;

    // If all expected resources have been loaded
    if (!this.res.length) {
        // If a cookie should be set
        if (this.hash) {
            const expires = new Date(+new Date() + 604800000).toUTCString();
            const cookie = `sb${this.slot ? `_${this.slot}` : ''}`;
            document.cookie = `${cookie}=${this.hash}; expires=${expires}`;
        }

        // Look for a callback to be run
        if ((typeof this.cb === 'string') && this.cb.length && (this.cb in window) && (typeof window[this.cb] === 'function')) {
            this.cb = window[this.cb];
        }
        if (typeof this.cb === 'function') {
            this.cb();
        }
    }
};
