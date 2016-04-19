"use strict";
var phantom = require('phantom');
var q = require('q');
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
        console.log('getPhantom');
        return ph.createPage().then(function (page) {
            console.log('createPage');
            page.property('viewportSize', { width: width, height: height })
                .then(function () {
                console.log('setViewportSize');
                page.open(url).then(function (status) {
                    var p = q.when();
                    if (devicePixelRatio && devicePixelRatio !== 1) {
                        p = evaluate(page, function (devicePixelRatio) {
                            document.body.style.webkitTransform = "scale(" + devicePixelRatio + ")";
                            document.body.style.webkitTransformOrigin = "0% 0%";
                            document.body.style.width = (100 / devicePixelRatio) + "%";
                        }, devicePixelRatio);
                    }
                    return p.then(function () {
                        var deferred = q.defer();
                        mkdirp(__dirname + savePath, function (err) {
                            if (err)
                                deferred.reject(err);
                            page.render(savePath + "/" + saveFilename, { format: 'jpg', quality: '60' }).then(function () {
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
    return (config.pages || []).reduce(function (promiseP, page) {
        return promiseP.then(function () {
            // For each screenshot size
            return (config.screenshots || []).reduce(function (promiseS, screenshot) {
                return promiseS.then(function () {
                    return generateImg(page.url, screenshot.width, screenshot.height, screenshot.devicePixelRatio, screenshot.savePath, screenshot.filename + "-" + page.name + ".jpg");
                });
            }, q.when());
            // --
        });
    }, q.when())
        .then(function () {
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
// var ph;
// var output = {
//   generate: function (url, width, height, devicePixelRatio, savePath, saveFilename) {
//     var deferred = q.defer();
//     if (!url || !width || !height || !savePath || !saveFilename) {
//       deferred.reject({ error: "A required argument is missing" });
//       return deferred.promise;
//     }
//     if (!ph) {
//       phantom.create(function (newPh) {
//         ph = newPh;
//         doGen();
//       })
//     } else {
//       doGen();
//     }
//     function doGen() {
//       ph.createPage(function (page) {
//         page.setViewportSize(width, height, function () {
//           page.open(url, function () {
//             if (devicePixelRatio && devicePixelRatio !== 1) {
//               evaluate(page, function (devicePixelRatio) {
//                 document.body.style.webkitTransform = "scale(" + devicePixelRatio + ")";
//                 document.body.style.webkitTransformOrigin = "0% 0%";
//                 document.body.style.width = (100 / devicePixelRatio) + "%";
//               }, devicePixelRatio);
//             }
//             mkdirp(__dirname + savePath, function (err) {
//               if (err) deferred.reject(err);
//               page.render(savePath + "/" + saveFilename, { format: 'jpg', quality: '60' }, function (err) {
//                 console.log("Generated screenshot", url, savePath, saveFilename);
//                 if (err) {
//                   deferred.reject(err);
//                 } else {
//                   deferred.resolve({ success: true });
//                 }
//                 page.close();
//               });
//             });
//           });
//         });
//       });
//     }
//     return deferred.promise;
//   },
//   generateAll: function () {
//     var deferred = q.defer();
//     async.eachLimit(output.screenshots, 1, function (item, cb1) {
//       async.eachLimit(output.pages, 1, function (page, cb2) {
//         output.generate(page.url, item.width, item.height, item.devicePixelRatio, item.savePath, item.filename + page.name + ".jpg")
//           .then(function (result) {
//             cb2();
//           })
//           .catch(cb2)
//       }, function (err) {
//         cb1(err);
//       })
//     }, function (err) {
//       if (ph) ph.exit();
//       if (err) {
//         deferred.reject(err);
//       } else {
//         deferred.resolve(true);
//       }
//     });
//     return deferred.promise;
//   },
//   pages: [],
// };
//# sourceMappingURL=screenshots.js.map