/* eslint-disable import/no-extraneous-dependencies */

/**
 * shortbread is an asynchronous, non-blocking loading pattern for CSS and JavaScript resources
 *
 * @see https://github.com/jkphl/shortbread
 *
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2019 Joschi Kuphal
 * @license MIT https://raw.github.com/jkphl/gulp-cache-bust-meta/master/LICENSE
 */

const gulp = require('gulp');
const shortbread = require('.').stream;
const vinyl = require('vinyl-file');
const path = require('path');
const filter = require('gulp-filter');
const template = require('gulp-template');

gulp.task('default', (done) => {
    const criticalJS = vinyl.readSync('test/fixtures/critical.js');
    const criticalCSS = vinyl.readSync('test/fixtures/critical.css');
    const tmpl = filter(['**/*.php'], { restore: true });

    // Start with your JavaScript, CSS and template resources
    gulp.src(['**/fixtures/*.js', '**/fixtures/style.css', 'gulp/*.php'], { cwd: path.join(__dirname, 'test') })

        // Run shortbread
        .pipe(shortbread([criticalJS, criticalCSS], 'main', null, { prefix: '/' }))

        // Filter all but the template file
        .pipe(tmpl)

        // Run the template engine
        .pipe(template())

        // Restore all files
        .pipe(tmpl.restore)

        // Write the files to their destination
        .pipe(gulp.dest('./tmp'));

    done();
});
