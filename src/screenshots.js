"use strict";
var phantom = require('phantom');
var q = require('q');
var path = require('path');
var mkdirp = require('mkdirp');
var config = {
    pages: [{
            "url": "http://localhost:8100/",
            "name": "login"
        }, {
            "url": "http://localhost:8100/?screen=home",
            "name": "home"
        }],
    screenshots: [
        { width: 750, height: 1334 },
        { width: 640, height: 1136 },
        { width: 640, height: 960 },
        { width: 768, height: 1024 },
        { width: 1242, height: 2208, devicePixelRatio: 2 },
        { width: 2048, height: 2732, devicePixelRatio: 2 }
    ]
};
function evaluate(page, func) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
    return page.evaluateJavaScript(fn);
}
var ph;
var getPhantom = function () {
    var deferred = q.defer();
    if (ph) {
        deferred.resolve(ph);
    }
    else {
        phantom.create().then(function (ph) {
            deferred.resolve(ph);
        });
    }
    return deferred.promise;
};
function generateImg(url, width, height, devicePixelRatio, savePath, saveFilename) {
    //console.log(saveFilename);
    return getPhantom().then(function (ph) {
        // console.log('getPhantom');
        return ph.createPage().then(function (page) {
            // console.log('createPage');
            page.property('settings.userAgent', 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5')
                .then(function () {
                page.property('zoomFactor', devicePixelRatio || 1)
                    .then(function () {
                    page.property('viewportSize', { width: width, height: height })
                        .then(function () {
                        // console.log('setViewportSize');
                        page.open(url).then(function (status) {
                            var p = q.when();
                            if (devicePixelRatio && devicePixelRatio !== 1) {
                                p = p.then(function () {
                                    return evaluate(page, function (devicePixelRatio) {
                                        // document.body.style.webkitTransform = "scale(" + devicePixelRatio + ")";
                                        // document.body.style.transform = "scale(" + devicePixelRatio + ")";
                                        // document.body.style.webkitTransformOrigin = "0% 0%";
                                        // document.body.style.width = (100 / devicePixelRatio) + "%";
                                    }, devicePixelRatio);
                                });
                            }
                            return p.then(function () {
                                var deferred = q.defer();
                                mkdirp(savePath, function (err) {
                                    if (err)
                                        deferred.reject(err);
                                    setTimeout(function () {
                                        evaluate(page, function () {
                                            var el = document.querySelectorAll('scroll-content')[0];
                                            if (el) {
                                                el.style.overflow = 'hidden';
                                            }
                                        }, null).then(function () {
                                            page.render(path.join(savePath, saveFilename), { format: 'png', quality: '100' }).then(function () {
                                                console.log("Generated screenshot", url, savePath, saveFilename);
                                                deferred.resolve();
                                                page.close();
                                            });
                                        });
                                    }, 7000);
                                });
                                return deferred.promise;
                            });
                        });
                    });
                });
            });
        });
    });
}
function generate(config) {
    // For each page
    return (config.pages || []).reduce(function (promiseP, page) {
        return promiseP.then(function () {
            // For each screenshot size
            return (config.screenshots || []).reduce(function (promiseS, screenshot) {
                return promiseS.then(function () {
                    return generateImg(page.url, screenshot.width, screenshot.height, screenshot.devicePixelRatio, path.join(process.cwd(), 'screens'), screenshot.width + "x" + screenshot.height + "@" + page.name + ".png");
                });
            }, q.when());
            // --
        });
    }, q.when())
        .then(function () {
        console.log('All done');
        if (ph) {
            ph.exit();
            ph = null;
        }
    })
        .catch(function () {
        if (ph) {
            ph.exit();
            ph = null;
        }
    });
    // --
}
generate(config).done();
//# sourceMappingURL=screenshots.js.map