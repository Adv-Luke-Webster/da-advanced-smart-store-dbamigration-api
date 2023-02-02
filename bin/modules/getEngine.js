const _ = require('underscore')
const log = require('../helper/logger')
const chalk = require('chalk')

function getDb (ct) {
  let _db

  if (_.isString(ct)) {
    jdbcBits = ct.split(':')
    const engine = jdbcBits.length > 1 ? jdbcBits[1] : ''
    const connObject = ct.split(';')

    if (engine === 'sqlserver') {
      for (let i = 0; i < connObject.length; i++) {
        if (connObject[i].includes('databaseName')) {
          _db = connObject[i].split('=')[1]
        }
      }
    }

    switch (engine) {
      case 'sqlserver':
        if (_db) {
          try {
            _db = require('./dbengines/SqlServer.js')
            log.info(chalk.blue('Driver to use: ' + engine))
          } catch (err) {
            log.error(chalk.red('Error loading ./dbengines/SqlServer.js: ' + err))
            return
          }
        }
        break
      case 'postgresql':
        if (_db) {
          try {
            _db = require('./dbengines/PostgreSql.js')
          } catch (err) {
            log.error(chalk.red('Error loading ./dbengines/PostgreSql.js: ' + err))
            return
          }
        }
        break
      case 'oracle':
        if (_.isUndefined(_db)) {
          try {
            _db = require('./dbengines/Oracle.js')
          } catch (err) {
            log.error(chalk.red('Error loading ./dbengines/Oracle.js: ' + err))
            return
          }
        }
        break
      default:
        return ({ message: "Could not resolve a database handler for engine '" + engine + "'" })
    }
  }
  return _db
}

const getEngineDetails = function (ct) {
  return getDb(ct).then(function (db) {
    return db.engineDetails
  })
}

module.exports = {
  getEngineDetails,
  getDb
}
