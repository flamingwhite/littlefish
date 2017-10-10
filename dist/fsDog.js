'use strict';

var fs = require('fs');

var fileExists = function fileExists(filePath) {
  return fs.existsSync(filePath);
};

var isFile = function isFile(filePath) {
  return fileExists(filePath) && fs.lstatSync(filePath).isFile();
};

var isDirectory = function isDirectory(filePath) {
  return fileExists(filePath) && fs.lstatSync(filePath).isDirectory();
};

module.exports = {
  fileExists: fileExists,
  isFile: isFile,
  isDirectory: isDirectory
};