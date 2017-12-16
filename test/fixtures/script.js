/* exported allLoaded */

function allLoaded() {
    setTimeout(function callback() {
        document.body.className += ' all';
        document.getElementById('reload-subsequent').disabled = false;
    }, 2000 + (Math.random() * 3000));
}

document.documentElement.className += ' js';

/* criticaljs (don't remove, used for testing) */
