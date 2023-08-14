const fse = require('fs-extra');
const path = require('path');
const logger = require('./logger');

module.exports = function clearDump() {
  try {
    fse.emptyDirSync(path.join(__dirname, '../../dumps'));
    logger.log('info', `clear dump ${new Date()}`);
  } catch (err) {
    logger.log('error', `clear dump error ${path.join(__dirname, '../../dumps')} ${new Date()}`);
  }
};
