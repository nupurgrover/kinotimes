var logger = new (require('../utils/logger.js'));
var db = new (require('../core/Database.js'));
var router = require("express").Router();
var apicache = require("apicache");
var moment = require('moment');

apicache.options({ debug: true });
let cache = apicache.middleware;

// routes served at /api/...
router.route("/getAll").get(getAllFilms);
router.route("/byTitle").get(cache('1 hour'), getFilmsWithTimes);
router.route("/byTheater").get(cache('1 hour'), getTheatersWithTimes);

router.route("/updateImdb").get(updateFilms);

router.route("/cache/clear").get((req, res) => {
    logger.info('clearing cache', apicache.getIndex());
    res.json(apicache.clear())
});

function getAllFilms(req, res) {
    logger.info('get all films');
    db.getAllFilms(function (err, films) {
        if (err){
            res.send(err);
        } else {
            res.json(films);
        }
    });
}
function getFilmsWithTimes(req, res) {
    logger.info('get showtimes at the controller');
    req.apicacheGroup = "byTitle"
    var startPoint = moment().toDate();
    var cutoff = moment().add(4, 'days').toDate();
    db.getFilmsWithTimeFilter(startPoint, cutoff, function (err, films) {
        if (err){
            res.send(err);
        } else {
            res.json(films);
        }
    });
}

function getTheatersWithTimes(req, res) {
    logger.info('get showtimes based on theater');
    req.apicacheGroup = "byTheater"
    var startPoint = moment().toDate();
    var cutoff = moment().add(4, 'days').toDate();
    db.getTheatersWithTimes(startPoint, cutoff, function (err, films) {
        if (err){
            res.send(err);
        } else {
            res.json(films);
        }
    });
}

function updateFilms(req, res) {
    var UpdateFilmInfo = require('../core/UpdateFilmInfo.js');
    var ImageStoring = require('../core/ImageStoring.js');
    var updater = new UpdateFilmInfo();
    var imager = new ImageStoring();

    logger.info('updating imdb...');
    updater.imdbUpdateById(function(err){
        logger.info('done imdb updating', err);
        imager.getImages([], function(err){
            logger.info('done image updating', err);
        })
    });
}

module.exports = router;