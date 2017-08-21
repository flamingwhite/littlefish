const request = require('request-promise-native');
const fs = require('fs');
const {
	fileExists
} = require('./fsDog');

const makeDownloader = (options = {}) => {
	const defaultOptions = {
		skipIfExists: true,
	};

	const config = {
		...defaultOptions,
		...options,
	}

	const {
		checkHeader,
		skipIfExists
	} = config;

	const downloader = async(uri, filename) => {

		const pass = await ((!fileExists(filename) || !skipIfExists) && (!checkHeader || request.head(uri).then(checkHeader)));

		return pass ? new Promise((resolve) => {
			request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve('done'));
		}) : Promise.reject('File not downloaded, probably because the file already exists');
	}

	return downloader;
};

const downloader = makeDownloader();

module.exports = {
	downloader,
	makeDownloader
};

// downloader('https://www.google.com/images/srpr/logo3w.png', 'googld.png').then(console.log).catch(console.log)
