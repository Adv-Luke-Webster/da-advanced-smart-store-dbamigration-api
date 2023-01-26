const logger = require('./logProcessor.js')
const path = require('path')
const config = require('../config.json')
const chalk = require('chalk')
// Set logger module
const logSetup = (configData) => {
  return {
    config: configData,
    get: function (name) {
      return config[name]
    }
  }
}
const log = logger.setUpLogs(
  logSetup(config),
  path.join(__dirname, '..', 'logs')
)

const coloredLogger = {
  info: function (text) {
    log.info(chalk.blue(text))
  },
  error: function (text) {
    log.info(chalk.red(text))
  },
  warn: function (text) {
    log.info(chalk.yellow(text))
  },
  verbose: function (text) {
    log.info(chalk.magenta(text))
  }
}

module.exports = coloredLogger
