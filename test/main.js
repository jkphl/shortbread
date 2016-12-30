/* global describe it */
const shortbread = require('../');
const should = require('should');
const assert = require('stream-assert');
const path = require('path');
const fs = require('fs');
const vinyl = require('vinyl-file');
const gulp = require('gulp');
require('mocha');

const js = vinyl.readSync(path.join(__dirname, 'fixtures/script.js'));
const jsHash = shortbread.createHash(js.contents.toString());
const css = vinyl.readSync(path.join(__dirname, 'fixtures/style.css'));
const cssHash = shortbread.createHash(css.contents.toString());

describe('shortbread()', () => {
    it('should ignore null files', () => {
        const result = shortbread();
        should(result).be.Object();
        should(result.initial).be.empty();
        should(result.subsequent).be.empty();
        should(result.resources).be.empty();
        should(result.hash).be.null();
        should(result.cookie).equal('sb');
    });

    it('should ignore non-Vinyl files', () => {
        const result = shortbread(['javascript'], ['css'], 'critical');
        should(result).be.Object();
        should(result.initial).be.empty();
        should(result.subsequent).be.empty();
        should(result.resources).be.empty();
        should(result.hash).be.null();
        should(result.cookie).equal('sb');
    });

    describe('should work with', () => {
        describe('a single JavaScript resource', () => {
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
                        should(result.resources).be.length(1);
                        should(result.resources[0]).equal(jsHash);
                        should(result.hash).equal(shortbread.createHash(jsHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('multiple JavaScript resources', () => {
            const tests = {
                'given as Vinyl file array': [js, js],
                'given as Vinyl file object': { one: js, two: js },
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
                        should(result.subsequent).equal('<script src="test/fixtures/script.js"></script><script src="test/fixtures/script.js"></script>');
                        should(result.resources).be.length(2);
                        should(result.resources).deepEqual([jsHash, jsHash]);
                        should(result.hash).equal(shortbread.createHash(`${jsHash}-${jsHash}`));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('a single CSS resource', () => {
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
                        should(result.resources).be.length(1);
                        should(result.resources[0]).equal(cssHash);
                        should(result.hash).equal(shortbread.createHash(cssHash));
                        should(result.cookie).equal('sb');
                    });
                }
            }
        });
        describe('multiple CSS resources', () => {
            const tests = {
                'given as Vinyl file array': [css, css],
                'given as Vinyl file object': { one: css, two: css },
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
                        should(result.subsequent).equal('<link rel="stylesheet" href="test/fixtures/style.css"><link rel="stylesheet" href="test/fixtures/style.css">');
                        should(result.resources).be.length(2);
                        should(result.resources).deepEqual([cssHash, cssHash]);
                        should(result.hash).equal(shortbread.createHash(`${cssHash}-${cssHash}`));
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
            should(result.resources).be.length(2);
            should(result.resources).deepEqual([jsHash, cssHash]);
            should(result.hash).equal(shortbread.createHash(`${jsHash}-${cssHash}`));
            should(result.cookie).equal('sb');
        });
    });

    describe('should support options', () => {
        it('critical CSS', () => {
            const criticalcss = vinyl.readSync(path.join(__dirname, 'fixtures/critical.css'));
            const result = shortbread(null, null, criticalcss);
            should(result.initial).be.not.empty();
            should(result.initial).startWith('<style>');
            should(result.initial).endWith('</style>');
            should(result.initial).match(/criticalcss/);
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
});

describe('shortbread().stream', () => {
    it('should ignore null files', (done) => {
        const stream = shortbread.stream();
        stream.pipe(assert.length(0))
            .pipe(assert.end(done));
        stream.end();
    });

    it('should emit error on streamed file', (done) => {
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
                should(d.data).have.property('resources', []);
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
                should(d.data.resources).be.Array();
                should(d.data.resources).be.length(2);
                should(d.data.resources).deepEqual([jsHash, cssHash]);
                should(d.data).have.property('hash', shortbread.createHash(`${jsHash}-${cssHash}`));
                should(d.data).have.property('cookie', 'sb');
            }))
            .pipe(assert.end(done));
    });

    describe('should support options', () => {
        it('file extension filters', (done) => {
            const jsxHash = shortbread.createHash(fs.readFileSync(path.join(__dirname, 'fixtures/helloworld.jsx')));
            const scssHash = shortbread.createHash(fs.readFileSync(path.join(__dirname, 'fixtures/critical.scss')));
            gulp.src(['fixtures/*', 'gulp/gulp.php'], { cwd: __dirname })
                .pipe(shortbread.stream(null, null, null, { css: ['\\.scss$'], js: ['\\.jsx$'] }))
                .pipe(assert.length(6))
                .pipe(assert.nth(2, (d) => {
                    should(d.data).be.Object();
                    should(d.data.resources).be.Array();
                    should(d.data.resources).be.length(2);
                    should(d.data.resources).deepEqual([jsxHash, scssHash]);
                    should(d.data).have.property('hash', shortbread.createHash(`${jsxHash}-${scssHash}`));
                    should(d.data).have.property('cookie', 'sb');
                }))
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
                    should(result.resources).be.empty();
                    should(result.hash).be.Null();
                    should(result.cookie).equal('sb');
                }))
                .pipe(assert.end(done));
        });
    });
});
