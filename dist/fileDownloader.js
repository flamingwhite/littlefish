'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var request = require('request-promise-native');
var fs = require('fs');

var _require = require('./fsDog'),
    fileExists = _require.fileExists;

var makeDownloader = function makeDownloader() {
	var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	var defaultOptions = {
		skipIfExists: true
	};

	var config = _extends({}, defaultOptions, options);

	var checkHeader = config.checkHeader,
	    skipIfExists = config.skipIfExists;


	var downloader = async function downloader(uri, filename) {

		var pass = await ((!fileExists(filename) || !skipIfExists) && (!checkHeader || request.head(uri).then(checkHeader)));

		return pass ? new Promise(function (resolve) {
			request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve('done'));
		}) : Promise.reject('File not downloaded, probably because the file already exists');
	};

	return downloader;
};

var downloader = makeDownloader();

module.exports = {
	downloader: downloader,
	makeDownloader: makeDownloader
};

// downloader('https://www.google.com/images/srpr/logo3w.png', 'googld.png').then(console.log).catch(console.log)