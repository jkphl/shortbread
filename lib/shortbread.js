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
 * Register a loaded resource
 *
 * @param {string} resource Resource hash
 */
Shortbread.prototype.loaded = function loaded(resource) {
    this.res = this.res.filter(r => r !== resource);

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