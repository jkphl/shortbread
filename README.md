shortbread [![NPM version][npm-image]][npm-url] [![NPM downloads][npm-downloads]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency Status][depstat-image]][depstat-url] [![Development Dependency Status][devdepstat-image]][devdepstat-url]
===

is a Node module that helps you implement an asynchronous loading strategy for your CSS and JavaScript resources, thus improving the *start render time* of your websites. It's intendend to be part of your toolchain and plays well with Grunt, Gulp and alike.

Installation
------------

To add *shortbread* as a development dependency to your project, run

```bash
npm install shortbread --save-dev
```

Asynchronous resource loading
-----------------------------
Most often, not all the CSS and JavaScript resources referenced by your website are really necessary for initially rendering the page to a visitor. It makes sense to distinguish between critical and non-critical resources and defer loading the non-critical ones until the page got rendered to the screen. To further speed up things, it might also make sense to additionally inline critical stuff directly into your HTML on first page load while leveraging the browser cache on subsequent visits.

Using *shortbread* is pretty straightforward. Simply provide it with

* all the **JavaScript resources** you want to load,
* all your **CSS resources**,
* an optional **[critical CSS](https://www.smashingmagazine.com/2015/08/understanding-critical-css/)** resource (subject to inlining),
* an optional **cookie slot** (see below) and
* an optional **JavaScript callback** you want to call after all resources have been loaded.

Based on these values, *shortbread* creates **two HTML fragments** (for the first and subsequent page loads) that you need to include into the `<head>` of your HTML source (immediate beginning).


### First page load

The first page load fragment will accomplish the following:

1. First, it will inline some JavaScript (including parts of [Filament Group's loadCSS](https://github.com/filamentgroup/loadCSS)) that is needed to create a *shortbread* instance and perform the following steps.
2. It will load your JavaScript resources [with `async` and `defer`](https://www.igvita.com/2014/05/20/script-injected-async-scripts-considered-harmful/) and register them with *shortbread* once they finished loading.
3. It inlines your critical CSS (if any).
4. It will load your CSS resources [with `rel=preload`](https://www.w3.org/TR/2015/WD-preload-20150721/) (polyfilled if necessary) and register them with *shortbread* once they finished loading.
6. There's also a `<noscript>` fallback for (synchronously) loading the CSS resources in case there's no support for JavaScript.
7. As soon as all JavaScript and CSS resources finished loading, *shortbread*
    * sets a cookie (optionally slotted in case you use several different bundles) that your server can used for distinguishing between initial and subsequent page loads.
    * call the JavaScript callback you provided (if any).


### Subsequent page loads

Based on the cookie set earlier, your server should be able to detect subsequent page loads and include the alternative HTML fragment. This one leverages the browser cache and simply

1. loads your JavaScript resources (still with `async` and `defer` — because, why not?) and
2. loads your CSS resources (this time synchronously).


### Shortbread cookie

The cookie used by shortbread serves two purposes:

1. If set, the server recognizes that the resources have already been loaded and switches into subsequent page load mode (i.e. doesn't make the client load the resources asynchronously as they should already be cached).
2. The expected cookie value represents a unique set of resources and changes whenever one of the resources changes in content. This way the cookie serves as a cache busting measure and ensures that the resources get updated as soon as they're modified on the server. Please be aware that you also need to adapt [the server-side code](#server-side-load-type-detection) whenever the resources change.


API
---

To use *shortbread* from JavaScript, you'd do the following (example for NodeJS):

```js
const shortbread = require('shortbread');
const fragments = shortbread(jsResources, cssResources, criticalCSS, 'main', 'allLoaded');
```

`fragments` will now hold an object with the following properties:

```js
{
    initial: '<script>...</noscript>', // Initial page load fragment
    subsequent: '<script>...</link>', // Subsequent page load fragment
    resources: ['422a6fc6', '60062743'], // Single resource hashes
    hash: 'df5bf8f7', // Cookie value when all resources are loaded
    cookie: 'sb_main' // Cookie name (here: including "main" slot)
}
```

You can use these values as templating variables when rendering the [the server-side code](#server-side-load-type-detection) to handle client requests.

### Arguments

The signature of the `shortbread()` function looks like this:

```js
/**
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {File|Array.<File>|Object.<String, File>} js JavaScript resource(s)
 * @param {File|Array.<File>|Object.<String, File>} css CSS resource(s)
 * @param {File} critical Critical CSS resource
 * @param {String} slot Cookie slot
 * @param {Function|Array|Object} callback Callback(s)
 */
function shortbread(js = [], css = [], critical = null, slot = null, callback = null) {
    // ...
}
```

#### File arguments

*shortbread* expects you to use [Vinyl objects](https://github.com/gulpjs/vinyl) to enter your JavaScript and CSS resources (`js`, `css` and `critical` arguments). When creating `<script src="...">` and `<link href="...">` elements, it uses the Vinyl objects' [`relative` getter](https://github.com/gulpjs/vinyl#filerelative) to determine the request paths for your resources, so you can easily use virtual paths for your files. I recommend [vinyl-file](https://github.com/sindresorhus/vinyl-file) for easily creating Vinyl instances. Example:

```js
const vinyl = require('vinyl-file');

const script = vinyl.readSync(path.join(__dirname, 'path/to/script.js'));
script.path = `${script.base}/js/mysite.js`;

// Will create `<script src="js/mysite.js" async defer></script>`
```

#### Cookie slot

By default, the name of the *shortbread* cookie is `sb`. If you're using multiple resource sets, however, you'll have to keep track of them separately by "slotting" the cookie. When you pass a `slot` argument to the `shortbread()` function, say `"set1"`, the cookie will be named `sb_set1`. The actual cookie name is returned in the `cookie` property of `shortbread()`'s result object.


### Server side load type detection

The way you implement the server-side load type detection totally depends on your environment and the technologies involved in your website. In most cases you will want to plug *shortbread* into a templating process that creates code snippets or alike that you can integrate into your setup and use for handling client requests. An example [handlebars](http://handlebarsjs.com/) template for creating a [PHP](http://php.net/) script could look like this:

```php
<!DOCTYPE html>
<html lang="en">
    <head><?php

        // If the shortbread cookie is present and matches the expected master hash: It's a subsequent page load
        if (!empty($_COOKIE['{{cookie}}']) && ($_COOKIE['{{cookie}}'] === '{{hash}}')):

            ?>{{{subsequent}}}<?php

        // Else: It's an initial page load
        else:

            ?>{{{initial}}}<?php

        endif;

        ?><meta charset="UTF-8">
        <title>My site</title>
    </head>
    <body>
        <!-- Page content -->
    </body>
</html>
```

This is, by the way, pretty much the code used by the **example implementation** included in the package. You can run it and see *shortbread* in action by typing

```
npm run php
```

in your console and direct your browser to 'http://localhost:8080' afterwards. Obviously, you need PHP being installed on your machine for this.


### Grunt

TBD


### Gulp

TBD


Known problems / To-do
----------------------

Currently none.


Changelog
---------

Please refer to the [changelog](CHANGELOG.md) for a complete release history.


Legal
-----
Copyright © 2016 Joschi Kuphal <joschi@kuphal.net> / [@jkphl](https://twitter.com/jkphl). *shortbread* is licensed under the terms of the [MIT license](LICENSE.txt).


[npm-url]: https://npmjs.org/package/shortbread
[npm-image]: https://badge.fury.io/js/shortbread.svg
[npm-downloads]: https://img.shields.io/npm/dm/shortbread.svg

[travis-url]: http://travis-ci.org/jkphl/shortbread
[travis-image]: https://secure.travis-ci.org/jkphl/shortbread.svg

[coveralls-url]: https://coveralls.io/r/jkphl/shortbread
[coveralls-image]: https://img.shields.io/coveralls/jkphl/shortbread.svg

[depstat-url]: https://david-dm.org/jkphl/shortbread#info=dependencies
[depstat-image]: https://david-dm.org/jkphl/shortbread.svg
[devdepstat-url]: https://david-dm.org/jkphl/shortbread#info=devDependencies
[devdepstat-image]: https://david-dm.org/jkphl/shortbread/dev-status.svg

