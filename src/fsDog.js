const fs = require('fs');

const fileExists = filePath => fs.existsSync(filePath);

const isFile = filePath =>
  fileExists(filePath) && fs.lstatSync(filePath).isFile();

const isDirectory = filePath =>
  fileExists(filePath) && fs.lstatSync(filePath).isDirectory();

module.exports = {
  fileExists,
  isFile,
  isDirectory
};
