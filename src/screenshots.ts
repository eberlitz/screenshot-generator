import phantom = require('phantom');
import q = require('q');
var mkdirp = require('mkdirp');

var config = {
    pages: [{
        "url": "http://www.google.com",
        "name": "google"
    }],
    screenshots: [
        { filename: "android-10in-1280x720-land", width: 1280, height: 720, savePath: 'Media/android/screenshots/10in' },
        { filename: "android-10in-2048x1152-land", width: 2048, height: 1152, savePath: 'Media/android/screenshots/10in' },
        { filename: "android-7in-1280x800-land", width: 1280, height: 800, savePath: 'Media/android/screenshots/7in' },
        { filename: "android-10in-1280x720-port", width: 720, height: 1280, savePath: 'Media/android/screenshots/10in' },
        { filename: "android-10in-2048x1152-port", width: 1152, height: 2048, savePath: 'Media/android/screenshots/10in' },
        { filename: "android-7in-1280x800-port", width: 800, height: 1280, savePath: 'Media/android/screenshots/7in' },
        { filename: "android-4in-1280x720-land", width: 1920, height: 1080, savePath: 'Media/android/screenshots/4in' },
        { filename: "android-4in-1280x720-port", width: 1080, height: 1920, savePath: 'Media/android/screenshots/4in' },
        { filename: "ipad-1024x768-land", width: 1024, height: 768, savePath: 'Media/ios/screenshots/ipad' },
        {
            filename: "ipadretina-2048x1536-land",
            width: 2048,
            height: 1536,
            devicePixelRatio: 2,
            savePath: 'Media/ios/screenshots/ipadRetina'
        },
        { filename: "iphone4-960x640-land", width: 960, height: 640, savePath: 'Media/ios/screenshots/iphone4' },
        { filename: "iphone5-1136x640-land", width: 1136, height: 640, savePath: 'Media/ios/screenshots/iphone5' },
        { filename: "ipad-1024x768-port", width: 768, height: 1024, savePath: 'Media/ios/screenshots/ipad' },
        {
            filename: "ipadretina-2048x1536-port",
            width: 1536,
            height: 2048,
            devicePixelRatio: 2,
            savePath: 'Media/ios/screenshots/ipadRetina'
        },
        { filename: "iphone4-640x960-port", width: 640, height: 960, savePath: 'Media/ios/screenshots/iphone4' },
        { filename: "iphone5-640x1136-port", width: 640, height: 1136, savePath: 'Media/ios/screenshots/iphone5' },
        { filename: "iphone6p-1080x1920-port", width: 1080, height: 1920, savePath: 'Media/ios/screenshots/iphone6p' },
        { filename: "iphone6p-1920x1080-land", width: 1920, height: 1080, savePath: 'Media/ios/screenshots/iphone6p' },
        { filename: "iphone6-1334x750-land", width: 1334, height: 750, savePath: 'Media/ios/screenshots/iphone6' },
        { filename: "iphone6-750x1334-port", width: 750, height: 1334, savePath: 'Media/ios/screenshots/iphone6' }
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
        console.log('getPhantom');
        return ph.createPage().then((page) => {
            console.log('createPage');

            page.property('viewportSize', { width, height })
                .then(() => {
                    console.log('setViewportSize');
                    page.open(url).then((status: string) => {

                        var p = q.when();


                        if (devicePixelRatio && devicePixelRatio !== 1) {
                            p = evaluate(page, function (devicePixelRatio) {
                                document.body.style.webkitTransform = "scale(" + devicePixelRatio + ")";
                                document.body.style.webkitTransformOrigin = "0% 0%";
                                document.body.style.width = (100 / devicePixelRatio) + "%";
                            }, devicePixelRatio);
                        }

                        return p.then(() => {
                            var deferred = q.defer();
                            mkdirp(__dirname + savePath, function (err) {
                                if (err) deferred.reject(err);
                                page.render(savePath + "/" + saveFilename, { format: 'jpg', quality: '60' }).then(() => {
                                    console.log("Generated screenshot", url, savePath, saveFilename);
                                    deferred.resolve();
                                    page.close();
                                });
                            });
                            return deferred.promise;
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
                        screenshot.savePath,
                        `${screenshot.filename}-${page.name}.jpg`
                    );
                });
            }, q.when());
            // --
        });
    }, q.when())
        .then(() => {
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
