/* eslint-disable import/no-extraneous-dependencies */

/**
 * shortbread is an asynchronous, non-blocking loading pattern for CSS and JavaScript resources
 *
 * @see https://github.com/jkphl/shortbread
 *
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2016 Joschi Kuphal
 * @license MIT https://raw.github.com/jkphl/gulp-cache-bust-meta/master/LICENSE
 */

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
    gulp.src(['**/fixtures/script.js', '**/fixtures/style.css', 'gulp/*.php'], { cwd: path.join(__dirname, 'test') })
        .pipe(shortbread(critical, 'main', null))   // Run shortbread
        .pipe(tmpl)                                 // Filter all but the template file
        .pipe(template())                           // Run the template engine
        .pipe(tmpl.restore)                         // Restore all files
        .pipe(gulp.dest('./tmp'));                  // Write the files to their destination
});