var async = require('async'),
mongoose = require('mongoose');
var logger = new (require('../utils/logger.js'));
var db = new (require('./Database.js'));
var tmdb = require('moviedb')(process.env.TMDB_TOKEN);
var tmdb_settings = {
    "images_url": "http://image.tmdb.org/t/p/",
    "image_size": "w92",
    "max_calls": 20
};


function ImageStoring() {}


/*
 * @param {Array} films the list of films as an array of json objects
 * @param {Function} callback function(err, result)
 * @return {Number} sum
*/
ImageStoring.prototype.getImages = function(films, callback) {
	db.getAllFilms(function(err, films){
		if(err){
			logger.error(err);
			return callback(err);
		}
		var callsMade = 0;
		async.each(films, function(film, cb){
			if(!film.imdbID){
				logger.info('`' + film.title + '` doesnt have an imdb id');
				return cb();
			} else if(film.img && film.img.indexOf(tmdb_settings.images_url) > -1) {
				logger.verbose('`' + film.title + '` already has updated image');
				return cb();
			} else {
				callsMade++;
				if(callsMade >= tmdb_settings.max_calls){
					logger.warn('too many images updated already, postpone the rest for the next run');
					return cb();
				}
				logger.verbose('else call to get image info', film.imdbID);
				tmdb.movieImages({id: film.imdbID}, function(err, res) {
					if(err){
						if(err.status && err.status == '404'){
							logger.error("Image search error:", film.title, err['status'], err.message);
						} else {
							logger.error("Image search error:", film.title, err);
						}
						return cb();
					}
					var pathToUse = '',
					previousVote = -1;
					for(var x in res.posters) {
						if(res.posters[x].iso_639_1 == 'de'){
							logger.debug('picking the german image');
							pathToUse = res.posters[x].file_path;
							break;
						}
						if(res.posters[x].vote_count > previousVote){
							previousVote = res.posters[x].vote_count;
							pathToUse = res.posters[x].file_path;
						}
					}
					newPosterPath = tmdb_settings.images_url + tmdb_settings.image_size + pathToUse;
					logger.info(newPosterPath);
					db.saveFilmInfo({'title': film.title, 'img': newPosterPath}, function(err, saved){
						if(err) logger.error(err);
						cb();
					});
				});
			}
		}, function(err) {
			if(err) logger.error(err);
			callback();
		});
	});
};

module.exports = ImageStoring;
