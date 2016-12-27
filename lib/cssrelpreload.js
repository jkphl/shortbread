/* global this loadCSS shortbread */
(function cssrelpreload(w) {
    // rel=preload support test
    if (!w.loadCSS) {
        return;
    }
    const rp = loadCSS.relpreload = {};
    rp.support = function support() {
        try {
            return w.document.createElement('link').relList.supports('preload');
        } catch (e) {
            return false;
        }
    };

    // loop preload links and fetch using loadCSS
    rp.poly = function poly() {
        const links = w.document.getElementsByTagName('link');
        for (let i = 0; i < links.length; ++i) {
            const link = links[i];
            if (link.rel === 'preload' && link.getAttribute('as') === 'style') {
                w.loadCSS(link.href, link, () => SHORTBREAD_INSTANCE.loaded(link.id));
                link.rel = null;
            }
        }
    };

    // Load the stylesheets manually if rel=preload is not supported
    if (!rp.support()) {
        rp.poly();
        const run = w.setInterval(rp.poly, 300);
        if (w.addEventListener) {
            w.addEventListener('load', () => w.clearInterval(run));
        }
        if (w.attachEvent) {
            w.attachEvent('onload', () => w.clearInterval(run));
        }
    }
}(this));
