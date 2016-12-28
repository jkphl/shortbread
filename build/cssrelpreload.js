/* global this loadCSS SHORTBREAD_INSTANCE */
(function cssrelpreload(w) {
    // rel=preload support test
    if (!w.loadCSS) {
        return;
    }
    var rp = loadCSS.relpreload = {};
    rp.support = function support() {
        try {
            return w.document.createElement('link').relList.supports('preload');
        } catch (e) {
            return false;
        }
    };

    // loop preload links and fetch using loadCSS
    rp.poly = function poly() {
        var links = w.document.getElementsByTagName('link');

        var _loop = function _loop(i) {
            var link = links[i];
            if (link.rel === 'preload' && link.getAttribute('as') === 'style') {
                w.loadCSS(link.href, link, function () {
                    return SHORTBREAD_INSTANCE.loaded(link.id);
                });
                link.rel = null;
            }
        };

        for (var i = 0; i < links.length; ++i) {
            _loop(i);
        }
    };

    // Load the stylesheets manually if rel=preload is not supported
    if (!rp.support()) {
        (function () {
            rp.poly();
            var run = w.setInterval(rp.poly, 300);
            if (w.addEventListener) {
                w.addEventListener('load', function () {
                    return w.clearInterval(run);
                });
            }
            if (w.attachEvent) {
                w.attachEvent('onload', function () {
                    return w.clearInterval(run);
                });
            }
        })();
    }
})(this);