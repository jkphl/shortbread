/* exported allLoaded */

function allLoaded() {
    setTimeout(function callback() {
        document.body.className += ' all';
        document.getElementById('reload-successive').disabled = false;
    }, 2000 + (Math.random() * 3000));
}

document.body.className += ' js';
