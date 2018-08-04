/* global describe it */
const should = require('should');
const assert = require('stream-assert');
const path = require('path');
const fs = require('fs');
const vinyl = require('vinyl-file');
const gulp = require('gulp');
const shortbread = require('../');
require('mocha');

const js = vinyl.readSync(path.join(__dirname, 'fixtures/script.js'));
const jsHash = shortbread.createHash(js.contents.toString());
const jsUrl = 'https://example.com/script.js';
const jsUrlHash = shortbread.createHash(jsUrl);
const css = vinyl.readSync(path.join(__dirname, 'fixtures/style.css'));
const cssHash = shortbread.createHash(css.contents.toString());
const cssUrl = 'https://example.com/style.css';
const cssUrlHash = shortbread.createHash(cssUrl);

describe('shortbread()', () => {
    it('should ignore null files', () => {
        const result = shortbread();
        should(result).be.Object();
        should(result.initial).be.empty();
        should(result.subsequent).be.empty();
        should(Object.keys(result.resources)).be.empty();
        should(result.hash).be.null();
        should(result.cookie).equal('sb');
    });

    it('should ignore non-Vinyl files', () => {
        const result = shortbread(['javascript'], ['css'], 'critical');
        should(result).be.Object();
        should(result.initial).be.empty();
        should(result.subsequent).be.empty();
        should(Object.keys(result.resources)).be.empty();
        should(result.hash).be.null();
        should(result.cookie).equal('sb');
    });

    describe('should work with', () => {
        describe('a single local JavaScript resource', () => {
            const tests = {
                'given as Vinyl file': js,
                'given as Vinyl file array': [js],
                'given as Vinyl file object': { js },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).not.endWith('</noscript>');
                        should(result.initial).not.match(/loadCSS/);
                        should(result.initial).not.match(/onloadCSS/);
                        should(result.initial).not.match(/relpreload/);
                        should(result.initial).match(/function Shortbread/);
                        should(result.subsequent).equal('<script src="test/fixtures/script.js"></script>');
                        should(Object.keys(result.resources)).be.length(1);
                        should(Object.keys(result.resources).pop()).equal(jsHash);
                        should(result.hash).equal(shortbread.createHash(jsHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('a single remote JavaScript resource', () => {
            const tests = {
                'given as URL': jsUrl,
                'given as URL array': [jsUrl],
                'given as URL object': { jsUrl },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).not.endWith('</noscript>');
                        should(result.initial).not.match(/loadCSS/);
                        should(result.initial).not.match(/onloadCSS/);
                        should(result.initial).not.match(/relpreload/);
                        should(result.initial).match(/function Shortbread/);
                        should(result.subsequent).equal(`<script src="${jsUrl}"></script>`);
                        should(Object.keys(result.resources)).be.length(1);
                        should(Object.keys(result.resources).pop()).equal(jsUrlHash);
                        should(result.hash).equal(shortbread.createHash(jsUrlHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('multiple JavaScript resources', () => {
            const tests = {
                'given as Vinyl file / URL array': [js, jsUrl],
                'given as Vinyl file / URL object': { one: js, two: jsUrl },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).match(/function Shortbread/);
                        should(result.initial).not.endWith('</noscript>');
                        should(result.initial).not.match(/loadCSS/);
                        should(result.initial).not.match(/onloadCSS/);
                        should(result.initial).not.match(/relpreload/);
                        should(result.subsequent).equal(`<script src="test/fixtures/script.js"></script><script src="${jsUrl}"></script>`);
                        should(Object.keys(result.resources)).be.length(2);
                        should(Object.keys(result.resources)).deepEqual([jsHash, jsUrlHash]);
                        should(result.hash).equal(shortbread.createHash(`${jsHash}-${jsUrlHash}`));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('a single local CSS resource', () => {
            const tests = {
                'given as Vinyl file': css,
                'given as Vinyl file array': [css],
                'given as Vinyl file object': { css },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(null, tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).match(/function Shortbread/);
                        should(result.initial).endWith('</noscript>');
                        should(result.initial).match(/loadCSS/);
                        should(result.initial).match(/onloadCSS/);
                        should(result.initial).match(/relpreload/);
                        should(result.subsequent).equal('<link rel="stylesheet" href="test/fixtures/style.css">');
                        should(Object.keys(result.resources)).be.length(1);
                        should(Object.keys(result.resources).pop()).equal(cssHash);
                        should(result.hash).equal(shortbread.createHash(cssHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('a single remote CSS resource', () => {
            const tests = {
                'given as URL': cssUrl,
                'given as URL array': [cssUrl],
                'given as URL object': { cssUrl },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(null, tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).match(/function Shortbread/);
                        should(result.initial).endWith('</noscript>');
                        should(result.initial).match(/loadCSS/);
                        should(result.initial).match(/onloadCSS/);
                        should(result.initial).match(/relpreload/);
                        should(result.subsequent).equal(`<link rel="stylesheet" href="${cssUrl}">`);
                        should(Object.keys(result.resources)).be.length(1);
                        should(Object.keys(result.resources).pop()).equal(cssUrlHash);
                        should(result.hash).equal(shortbread.createHash(cssUrlHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('multiple CSS resources', () => {
            const tests = {
                'given as Vinyl file / URL array': [css, cssUrl],
                'given as Vinyl file / URL object': { one: css, two: cssUrl },
            };
            for (const t in tests) {
                if (Object.prototype.hasOwnProperty.call(tests, t)) {
                    it(t, () => {
                        const result = shortbread(null, tests[t]);
                        should(result.initial).be.not.empty();
                        should(result.initial).match(/function Shortbread/);
                        should(result.initial).endWith('</noscript>');
                        should(result.initial).match(/loadCSS/);
                        should(result.initial).match(/onloadCSS/);
                        should(result.initial).match(/relpreload/);
                        should(result.subsequent).equal(`<link rel="stylesheet" href="test/fixtures/style.css"><link rel="stylesheet" href="${cssUrl}">`);
                        should(Object.keys(result.resources)).be.length(2);
                        should(Object.keys(result.resources)).deepEqual([cssHash, cssUrlHash]);
                        should(result.hash).equal(shortbread.createHash(`${cssHash}-${cssUrlHash}`));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        it('both JavaScript and CSS resources', () => {
            const result = shortbread(js, css);
            should(result.initial).be.not.empty();
            should(result.initial).match(/function Shortbread/);
            should(result.initial).endWith('</noscript>');
            should(result.initial).match(/loadCSS/);
            should(result.initial).match(/onloadCSS/);
            should(result.initial).match(/relpreload/);
            should(result.subsequent).equal('<script src="test/fixtures/script.js"></script><link rel="stylesheet" href="test/fixtures/style.css">');
            should(Object.keys(result.resources)).be.length(2);
            should(Object.keys(result.resources)).eql([jsHash, cssHash]);
            should(result.hash).equal(shortbread.createHash(`${jsHash}-${cssHash}`));
            should(result.cookie).equal('sb');
        });
    });

    describe('should support options', () => {
        const criticalcss = vinyl.readSync(path.join(__dirname, 'fixtures/critical.css'));
        const criticaljs = vinyl.readSync(path.join(__dirname, 'fixtures/script.js'));
        describe('Critical CSS', () => {
            it('as Vinyl file', () => {
                const result = shortbread(null, null, criticalcss);
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<style>');
                should(result.initial).endWith('</style>');
                should(result.initial).match(/criticalcss/);
            });
            it('as Vinyl file array', () => {
                const result = shortbread(null, null, [criticalcss]);
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<style>');
                should(result.initial).endWith('</style>');
                should(result.initial).match(/criticalcss/);
            });
            it('as Vinyl file object', () => {
                const result = shortbread(null, null, { critical: criticalcss });
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<style>');
                should(result.initial).endWith('</style>');
                should(result.initial).match(/criticalcss/);
            });
        });
        describe('Critical JavaScript', () => {
            it('as Vinyl file', () => {
                const result = shortbread(null, null, criticaljs);
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<script>');
                should(result.initial).endWith('</script>');
                should(result.initial).match(/criticaljs/);
            });
            it('as Vinyl file array', () => {
                const result = shortbread(null, null, [criticaljs]);
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<script>');
                should(result.initial).endWith('</script>');
                should(result.initial).match(/criticaljs/);
            });
            it('as Vinyl file object', () => {
                const result = shortbread(null, null, { critical: criticaljs });
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<script>');
                should(result.initial).endWith('</script>');
                should(result.initial).match(/criticaljs/);
            });
        });
        describe('Critical CSS & JavaScript', () => {
            it('as Vinyl files array', () => {
                const result = shortbread(null, null, [criticalcss, criticaljs]);
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<style>');
                should(result.initial).endWith('</script>');
                should(result.initial).match(/criticalcss/);
                should(result.initial).match(/criticaljs/);
            });
            it('as Vinyl files object', () => {
                const result = shortbread(null, null, { css: criticalcss, js: criticaljs });
                should(result.initial).be.not.empty();
                should(result.initial).startWith('<style>');
                should(result.initial).endWith('</script>');
                should(result.initial).match(/criticalcss/);
                should(result.initial).match(/criticaljs/);
            });
        });
        it('cookie slot', () => {
            const result = shortbread(null, null, null, 'test');
            should(result.cookie).equal('sb_test');
        });
        it('callback', () => {
            const result = shortbread(js, null, null, null, 'allLoaded');
            should(result.initial).be.not.empty();
            should(result.initial).match(/,"allLoaded"\);/);
        });
        it('prefix', () => {
            const result = shortbread(js, null, null, null, null, { prefix: '/' });
            should(result.subsequent).equal('<script src="/test/fixtures/script.js"></script>');
        });
    });

    describe('should ignore', () => {
        it('invalid prefix', () => {
            const result = shortbread(js, null, null, null, null, { prefix: false });
            should(result.subsequent).equal('<script src="test/fixtures/script.js"></script>');
        });
    });
});

describe('shortbread().stream', () => {
    it('should ignore null files', (done) => {
        const stream = shortbread.stream();
        stream.pipe(assert.length(0))
            .pipe(assert.end(done));
        stream.end();
    });

    it('should error on invalid critical CSS', () => {
        shortbread.stream.bind(null, { invalid: true }).should
            .throw('shortbread.stream: Critical resources must be single a Vinyl object, a Vinyl object array or object');
    });

    it('should error on streamed file', (done) => {
        gulp.src(path.join(__dirname, 'fixtures/*.js'), { buffer: false })
            .pipe(shortbread.stream())
            .once('error', (err) => {
                err.message.should.eql('shortbread: Streaming not supported');
                done();
            });
    });

    it('should pass through other resources', (done) => {
        gulp.src(path.join(__dirname, 'gulp/gulp.php'))
            .pipe(shortbread.stream())
            .pipe(assert.length(1))
            .pipe(assert.nth(0, (d) => {
                should(path.basename(d.path)).eql('gulp.php');
                should(d.data).be.Object();
                should(d.data).have.property('initial', '');
                should(d.data).have.property('subsequent', '');
                should(d.data).have.property('resources', {});
                should(d.data).have.property('hash', null);
                should(d.data).have.property('cookie', 'sb');
            }))
            .pipe(assert.end(done));
    });

    it('should set result data other resources', (done) => {
        gulp.src(['fixtures/*.js', 'fixtures/style.css', 'gulp/gulp.php'], { cwd: __dirname })
            .pipe(shortbread.stream())
            .pipe(assert.length(3))
            .pipe(assert.nth(0, (d) => {
                should(path.basename(d.path)).eql('initial.html');
            }))
            .pipe(assert.nth(1, (d) => {
                should(path.basename(d.path)).eql('subsequent.html');
            }))
            .pipe(assert.nth(2, (d) => {
                should(path.basename(d.path)).eql('gulp.php');
                should(d.data).be.Object();
                should(d.data.initial).be.not.empty();
                should(d.data.subsequent).be.not.empty();
                should(Object.keys(d.data.resources)).be.Array();
                should(Object.keys(d.data.resources)).be.length(2);
                should(Object.keys(d.data.resources)).deepEqual([jsHash, cssHash]);
                should(d.data).have.property('hash', shortbread.createHash(`${jsHash}-${cssHash}`));
                should(d.data).have.property('cookie', 'sb');
            }))
            .pipe(assert.end(done));
    });

    describe('should support options', () => {
        const criticalcss = vinyl.readSync(path.join(__dirname, 'fixtures/critical.css'));
        const criticaljs = vinyl.readSync(path.join(__dirname, 'fixtures/script.js'));
        it('critical CSS & JavaScript', (done) => {
            gulp.src(['fixtures/*.js', 'fixtures/style.css'], { cwd: __dirname })
                .pipe(shortbread.stream([criticalcss, criticaljs]))
                .pipe(assert.length(2))
                .pipe(assert.nth(0, (d) => {
                    should(path.basename(d.path)).eql('initial.html');
                    should(d.contents.toString()).match(/criticalcss/);
                    should(d.contents.toString()).match(/criticaljs/);
                }))
                .pipe(assert.nth(1, (d) => {
                    should(path.basename(d.path)).eql('subsequent.html');
                }))
                .pipe(assert.end(done));
        });

        it('file extension filters', (done) => {
            const jsxHash = shortbread.createHash(fs.readFileSync(path.join(__dirname, 'fixtures/helloworld.jsx')));
            const scssHash = shortbread.createHash(fs.readFileSync(path.join(__dirname, 'fixtures/dummy.scss')));

            function assertData(d) {
                if ((path.extname(d.path) !== '.scss') && (path.extname(d.path) !== '.jsx')) {
                    should(d.data).be.Object();
                    should(Object.keys(d.data.resources)).be.Array();
                    should(Object.keys(d.data.resources)).be.length(2);
                    should(Object.keys(d.data.resources)).deepEqual([jsxHash, scssHash]);
                    should(d.data).have.property('hash', shortbread.createHash(`${jsxHash}-${scssHash}`));
                    should(d.data).have.property('cookie', 'sb');
                }
            }

            gulp.src(['fixtures/*', 'gulp/gulp.php'], { cwd: __dirname })
                .pipe(shortbread.stream(null, null, null, { css: ['\\.scss$'], js: ['\\.jsx$'] }))
                .pipe(assert.length(6))
                .pipe(assert.nth(2, assertData))
                .pipe(assert.nth(3, assertData))
                .pipe(assert.nth(4, assertData))
                .pipe(assert.nth(5, assertData))
                .pipe(assert.end(done));
        });

        it('custom fragment file names', (done) => {
            gulp.src(['fixtures/*.js', 'fixtures/style.css', 'gulp/gulp.php'], { cwd: __dirname })
                .pipe(shortbread.stream(null, null, null, { initial: 'first.html', subsequent: 'second.html' }))
                .pipe(assert.length(3))
                .pipe(assert.nth(0, (d) => {
                    should(path.basename(d.path)).eql('first.html');
                }))
                .pipe(assert.nth(1, (d) => {
                    should(path.basename(d.path)).eql('second.html');
                }))
                .pipe(assert.end(done));
        });

        it('slotted fragment file names', (done) => {
            gulp.src(['fixtures/*.js', 'fixtures/style.css', 'gulp/gulp.php'], { cwd: __dirname })
                .pipe(shortbread.stream(null, 'test'))
                .pipe(assert.length(3))
                .pipe(assert.nth(0, (d) => {
                    should(path.basename(d.path)).eql('initial.test.html');
                }))
                .pipe(assert.nth(1, (d) => {
                    should(path.basename(d.path)).eql('subsequent.test.html');
                }))
                .pipe(assert.end(done));
        });

        it('data JSON file', (done) => {
            gulp.src('none')
                .pipe(shortbread.stream(null, null, null, { data: true }))
                .pipe(assert.length(1))
                .pipe(assert.nth(0, (d) => {
                    should(path.basename(d.path)).eql('shortbread.json');
                    const result = JSON.parse(d.contents.toString());
                    should(result).be.Object();
                    should(result.initial).be.empty();
                    should(result.subsequent).be.empty();
                    should(Object.keys(result.resources)).be.empty();
                    should(result.hash).be.Null();
                    should(result.cookie).equal('sb');
                }))
                .pipe(assert.end(done));
        });

        it('external resources / URLs', (done) => {
            const resources = { jsUrl: [jsUrl], cssUrl: [cssUrl], data: true };
            const resourceHash = shortbread.createHash(`${jsHash}-${jsUrlHash}-${cssHash}-${cssUrlHash}`);
            gulp.src(['fixtures/*.js', 'fixtures/style.css', 'gulp/gulp.php'], { cwd: __dirname })
                .pipe(shortbread.stream(null, null, null, resources))
                .pipe(assert.length(4))
                .pipe(assert.nth(3, (d) => {
                    should(path.basename(d.path)).eql('shortbread.json');
                    const result = JSON.parse(d.contents.toString());
                    should(result).be.Object();
                    should(result.initial).not.be.empty();
                    should(result.subsequent).not.be.empty();
                    should(result.resources).not.be.empty();
                    should(Object.keys(result.resources)).be.Array();
                    should(Object.keys(result.resources)).be.length(4);
                    should(Object.keys(result.resources))
                        .deepEqual([jsHash, jsUrlHash, cssHash, cssUrlHash]);
                    should(result).have.property('hash', resourceHash);
                    should(result.cookie).equal('sb');
                }))
                .pipe(assert.end(done));
        });
    });
});
