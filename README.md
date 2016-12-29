shortbread [![NPM version][npm-image]][npm-url] [![NPM downloads][npm-downloads]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency Status][depstat-image]][depstat-url] [![Development Dependency Status][devdepstat-image]][devdepstat-url]
===

is a Node module that helps you implement an asynchronous, non-blocking loading strategy for your CSS and JavaScript resources, thus improving the *start render time* of your websites. It's intendend to be part of your toolchain and plays well with Grunt, Gulp and alike.

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

![First page load example](doc/shortbread_first_load.png)

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

![Subsequent page load example](doc/shortbread_subsequent_load.png)

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
    initial: '<script>...</noscript>',      // Initial page load fragment
    subsequent: '<script>...</link>',       // Subsequent page load fragment
    resources: ['422a6fc6', '60062743'],    // Single resource hashes
    hash: 'df5bf8f7',                       // Cookie value when all resources are loaded
    cookie: 'sb_main'                       // Cookie name (here: including "main" slot)
}
```

You can use these values as templating variables when rendering the [the server-side code](#server-side-load-type-detection) to handle client requests.

The signature of `shortbread()` looks like this:

```js
/**
 * Create HTML fragments for assynchronously loading JavaScript and CSS resources
 *
 * @param {File|Array.<File>|Object.<String, File>} js  [OPTIONAL] JavaScript resource(s)
 * @param {File|Array.<File>|Object.<String, File>} css [OPTIONAL] CSS resource(s)
 * @param {File} critical                               [OPTIONAL] Critical CSS resource
 * @param {String} slot                                 [OPTIONAL] Cookie slot
 * @param {String} callback                             [OPTIONAL] Callback
 */
function shortbread(js = [], css = [], critical = null, slot = null, callback = null) {
    // ...
}
```

### File arguments

*shortbread* expects you to use [Vinyl objects](https://github.com/gulpjs/vinyl) to enter your JavaScript and CSS resources (`js`, `css` and `critical` arguments). When creating `<script src="...">` and `<link href="...">` elements, it uses the Vinyl objects' [`relative` getter](https://github.com/gulpjs/vinyl#filerelative) to determine the request paths for your resources, so you can easily use virtual paths for your files. I recommend [vinyl-file](https://github.com/sindresorhus/vinyl-file) for easily creating Vinyl instances. Example:

```js
const vinyl = require('vinyl-file');

const script = vinyl.readSync(path.join(__dirname, 'path/to/script.js'));
script.path = `${script.base}/js/mysite.js`;

// Will create `<script src="js/mysite.js" async defer></script>`
```

### Cookie slot

By default, the name of the *shortbread* cookie is `sb`. If you're using multiple resource sets, however, you'll have to keep track of them separately by "slotting" the cookie. When you pass a `slot` argument to the `shortbread()` function, say `"set1"`, the cookie will be named `sb_set1`. The actual cookie name is returned in the `cookie` property of `shortbread()`'s result object.


Server side load type detection
-------------------------------

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


Gulp usage
----------

`shortbread.stream()` is an additional interface that's intended to be used with streams and supports some extended features. Simply pass in the JavaScript and CSS resources you'd like to include (*shortbread* will seperate them internally — see below) and you'll get two HTML fragment files as the output.

This is the `shortbread.stream()` function signature:

```js
/**
 * Streaming interface for shortbread
 *
 * @param {File} critical       [OPTIONAL] Critical CSS resource
 * @param {String} slot         [OPTIONAL] Cookie slot
 * @param {String} callback     [OPTIONAL] Callback
 * @param {Object} config       [OPTIONAL] Configuration
 */
function shortbread.stream(critical = null, slot = null, callback = null, config = {});
```

Again, the `critical` CSS (if any) needs to be passed in as a Vinyl object. Also the `slot` and `callback` arguments are identical to the [regular API](#api). The `config` object defaults to these values:

```js
{
    css: ['\\.css$'],               // List of regular expressions to match CSS resources
    js: ['\\.js$'],                 // List of regular expressions to match JavaScript resources
    initial: 'initial.html',        // Name for the initial page load HTML fragment
    subsequent: 'subsequent.html',  // Name for the subsequent page load HTML fragment
    data: false                     // Whether to create a JSON file with shortbread's return values
}
```

As you see, *shortbread* uses regular expressions to detect and separate your CSS and JavaScript resources. Any file that's not matched by any of the regular expressions will simply get passed through (and might be used for further templating processes, see below).

In case you're using a cookie `slot`, the slot name will be added to the fragment file names as in `initial.<slot>.html` and `subsequent.<slot>.html`.

If you set `data` to `true`, an additional JSON file `shortbread.json` (respectively `shortbread.<slot>.json`) will be created that contains the usual *shortbread* [result object](#api). You could use this file as variable source for a downstream templating process when generating your [server side junction code](#server-side-load-type-detection). However, there's a much smarter approach this this:

As mentioned above, *shortbread* will simply pass through any file that's not recognized as a CSS or JavaScript resource. Additionally, it sets the `data` property of these files to *shortbread*'s result object which effectively emulates [gulp-data](https://github.com/colynb/gulp-data)'s behaviour. That way (and with the help of [gulp-filter](https://github.com/sindresorhus/gulp-filter)) you can immediately plug this into a variety of templating engines like [gulp-swig](https://github.com/colynb/gulp-swig) or [gulp-jade / gulp-pug](https://github.com/pugjs/gulp-pug). Here's a gulpfile example that uses [gulp-template](https://github.com/sindresorhus/gulp-template) to parse a [Lo-Dash/Underscore template](http://lodash.com/docs#template) and create a simple PHP request handler out of it:

```js
const gulp = require('gulp');
const shortbread = require('.').stream;
const vinyl = require('vinyl-file');
const path = require('path');
const filter = require('gulp-filter');
const template = require('gulp-template');

gulp.task('default', () => {
    const critical = vinyl.readSync('test/fixtures/critical.css');
    const tmpl = filter(['**/*.php'], { restore: true });

    // Start with your JavaScript, CSS and template resources
    gulp.src(
        ['**/fixtures/script.js', '**/fixtures/style.css', 'gulp/*.php'],
        { cwd: path.join(__dirname, 'test') }
    )
        .pipe(shortbread(critical, 'main', null))   // Run shortbread
        .pipe(tmpl)                                 // Filter all but the template file
        .pipe(template())                           // Run the template engine
        .pipe(tmpl.restore)                         // Restore all files
        .pipe(gulp.dest('./tmp'));                  // Write the files to their destination
});
```

The template file for this might look like:

```php
<!DOCTYPE html>
<html lang="en">
    <head><?php

        // If the shortbread cookie is present and matches the expected master hash: It's a subsequent page load
        if (!empty($_COOKIE['<%= cookie %>']) && ($_COOKIE['<%= cookie %>'] === '<%= hash %>')) {
            include 'initial.main.html';

        // Else: It's an initial page load
        } else {
            include 'subsequent.main.html';
        }

        ?><meta charset="UTF-8">
        <title>My site</title>
    </head>
    <body>
        <!-- Page content -->
    </body>
</html>

```


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

