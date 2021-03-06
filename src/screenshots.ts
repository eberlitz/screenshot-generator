import phantom = require('phantom');
import q = require('q');
import path = require('path');
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


function evaluate(page, func, ...args: any[]) {
    var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
    return page.evaluateJavaScript(fn);
}

var ph: phantom.PhantomJS;
var getPhantom = () => {
    var deferred = q.defer<phantom.PhantomJS>();
    if (ph) {
        deferred.resolve(ph);
    } else {
        phantom.create().then((ph) => {
            deferred.resolve(ph);
        });
    }
    return deferred.promise;
};

function generateImg(url, width, height, devicePixelRatio, savePath, saveFilename) {

    //console.log(saveFilename);
    return getPhantom().then((ph) => {
        // console.log('getPhantom');
        return ph.createPage().then((page) => {
            // console.log('createPage');

            page.property('settings.userAgent', 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5')
                .then(() => {
                    page.property('zoomFactor', devicePixelRatio || 1)
                        .then(() => {
                            page.property('viewportSize', { width, height })
                                .then(() => {
                                    // console.log('setViewportSize');
                                    page.open(url).then((status: string) => {

                                        var p = q.when();

                                        if (devicePixelRatio && devicePixelRatio !== 1) {
                                            p = p.then(() => {
                                                return evaluate(page, function (devicePixelRatio) {
                                                    // document.body.style.webkitTransform = "scale(" + devicePixelRatio + ")";
                                                    // document.body.style.transform = "scale(" + devicePixelRatio + ")";
                                                    // document.body.style.webkitTransformOrigin = "0% 0%";
                                                    // document.body.style.width = (100 / devicePixelRatio) + "%";
                                                }, devicePixelRatio);
                                            });
                                        }

                                        return p.then(() => {
                                            var deferred = q.defer();
                                            mkdirp(savePath, function (err) {
                                                if (err) deferred.reject(err);

                                                setTimeout(() => {

                                                    evaluate(page, function () {
                                                        var el = document.querySelectorAll('scroll-content')[0];
                                                        if (el) {
                                                            el.style.overflow = 'hidden';
                                                        }
                                                    }, null).then(() => {
                                                        page.render(path.join(savePath, saveFilename), { format: 'png', quality: '100' }).then(() => {
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
    return (config.pages || []).reduce((promiseP, page) => {
        return promiseP.then(() => {

            // For each screenshot size
            return (config.screenshots || []).reduce((promiseS, screenshot) => {
                return promiseS.then(() => {
                    return generateImg(
                        page.url,
                        screenshot.width,
                        screenshot.height,
                        screenshot.devicePixelRatio,
                        path.join(process.cwd(), 'screens'),
                        `${screenshot.width}x${screenshot.height}@${page.name}.png`
                    );
                });
            }, q.when());
            // --
        });
    }, q.when())
        .then(() => {
            console.log('All done');
            if (ph) {
                ph.exit();
                ph = null;
            }
        })
        .catch(() => {
            if (ph) {
                ph.exit();
                ph = null;
            }
        });
    // --
}

generate(config).done();
