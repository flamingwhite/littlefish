const sh = require('shelljs');
const fs = require('fs');

const fileExists = filename => fs.existsSync(filename);

// const isFile = filename => fileExists(filename) && sh.ls('-l', filename).isFile();

module.exports = {
	fileExists
};