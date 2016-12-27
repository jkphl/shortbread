/**
 * Shortbread constructor
 *
 * @param {Array} resources Expected resources
 * @param {String} master Master hash
 * @param {Function|String} callback Callback (name)
 */
function shortbread(resources = [], master = null, callback = null) {
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
     * Callback function
     *
     * @type {Function}
     */
    this.cb = (typeof callback === 'function') ? callback : null;
    if ((typeof callback === 'string') && callback.length && (callback in window) && (typeof window[callback] === 'function')) {
        this.cb = window[callback];
    }
}

/**
 * Register a loaded resource
 *
 * @param {string} resource Resource hash
 */
shortbread.prototype.loaded = function loaded(resource) {
    this.res = this.res.filter(r => r !== resource);

    // If all expected resources have been loaded
    if (!this.res.length) {
        // If a cookie should be set
        if (this.hash) {
            const expires = new Date(+new Date() + 604800000).toUTCString();
            document.cookie = `shortbread=${this.hash}; expires=${expires}`;
        }

        // If a callback should be called
        if (this.cb) {
            this.cb();
        }
    }
};
