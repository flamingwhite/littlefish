'use strict';

var sh = require('shelljs');
var fs = require('fs');

var fileExists = function fileExists(filename) {
	return fs.existsSync(filename);
};

// const isFile = filename => fileExists(filename) && sh.ls('-l', filename).isFile();

module.exports = {
	fileExists: fileExists
};