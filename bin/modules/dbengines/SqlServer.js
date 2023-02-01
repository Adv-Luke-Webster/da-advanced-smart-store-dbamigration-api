const _ = require('underscore')
const moment = require('moment')
const IDbEngine = require('../../modules/dbengines/IDbEngine')
const path = require('path')
const log = require('../../helper/logger')
const chalk = require('chalk')
const statements = require('../../modules/sqlStatements')

const mssql = require('mssql')

const sqlTypes = require('../../modules/dbengines/SqlDataTypes.js').sqlTypes

if (_.isUndefined(log)) {
  log = logger.setUpLogs(
    config,
    path.join(__dirname, '..', '..', '..', 'logs')
  )
}

let initialised = false
let connConfig = {}
pool = null

function isInitialised () {
  return initialised
}

function getConfig (connString) {
  const connObject = connString.split(';')
  // Structure of jdbc connection string for SQL Server
  // jdbc:sqlserver://[serverName[\instanceName][:portNumber]][;property=value[;property=value]]
  // This should have a property like: databaseName=DbArchive;
  let _username
  let _password

  if (connString.substr(0, 17) != 'jdbc:sqlserver://') {
    return {
      message: 'The JDBC connection string is not valid for SQL Server'
    }
  }

  connConfig = {
    user: _username,
    password: _password,
    options: {},
    pool: {
      min: 3,
      max: 50
    }
  }

  const location = connString.substr(17).split(';')[0] // = "[serverName[\instanceName][:portNumber]]"
  const instance = location.indexOf('\\')
  if (instance >= 0) {
    connConfig.server = location.substr(0, instance)
    connConfig.options.instanceName = location.substr(instance + 1)
  } else {
    const portNumber = location.indexOf(':')
    if (portNumber >= 0) {
      connConfig.server = location.substr(0, portNumber)
      connConfig.port = location.substr(portNumber + 1)
    } else {
      connConfig.server = location
    }
  }

  for (let i = 1; i < connObject.length; i++) {
    if (connObject[i]) {
      const nvp = connObject[i].split('=')
      let boolValue
      if (nvp && nvp.length == 2) {
        switch (nvp[0].toLowerCase()) {
          case 'databasename':
          case 'database':
            connConfig.database = nvp[1]
            break
          case 'servername':
            connConfig.server = nvp[1]
            break
          case 'instancename':
            connConfig.options.instanceName = nvp[1]
            break
          case 'encrypt':
            boolValue = nvp[1]
            connConfig.options.encrypt = boolValue === nvp[1]
            break
          case 'trustservercertificate':
            boolValue = nvp[1]
            connConfig.options.trustServerCertificate = boolValue === nvp[1]

            break

          case 'integratedsecurity':
            if (nvp[1].toLowerCase() == 'true') {
              connConfig.options.trustedConnection = true
              connConfig.user = ''
              connConfig.password = ''
            }
            break
          case 'username':
          case 'user':
            connConfig.user = nvp[1]
            break
          case 'password':
            connConfig.password = nvp[1]
            break
        }
      }
    }
  }
  return connConfig
}

function getDb (ct) {
  return new Promise((resolve, reject) => {
    console.log(ct)
    resolve(jdbcBits[1])
  })
}

const resolveSQL = function (ct, sqlDef) {
  return new Promise((resolve, reject) => {
    getDb(ct)
      .then(function (db) {
        resolve(statements.utility.getTables[db].statement),
        function (err) {
          reject(err)
        }
      })
      .catch(function (err) {
        reject(err)
        log.error(
          chalk.red(
            'Database Access Error: ' + (err.message ? err.message : err)
          )
        )
      })
  })
}

function sqlExec (connString, st) {
  sqlStatement = st
  ct = connString
  getConfig(connString)
  return new Promise((resolve, reject) => {
    try {
      mssql.connect(connConfig, function (err) {
        if (err) console.log(err)
        const request = new mssql.Request()
        if (this.sqlStatement === 'getTables') {
          resolveSQL(ct, statements.utility.getTables)
            .then(function (statement) {
              request.query(statement, function (err, recordset) {
                if (err) console.log(err)
                resolve(recordset)
              })
            })
        }
        console.log(connConfig)
      })
    } catch (error) {
      reject(error)
      log.error(chalk.red('Error connecting to SQL Server:'))
      log.error(chalk.red(err))
    }
  })
}

function init (connString, action) {
  return new Promise((resolve, reject) => {
    getConfig(connString)
    try {
      if (action === 'open') {
        const pool = new mssql.ConnectionPool(connConfig)

        pool.on('error', function (err) {
          reject(err)
          log.error(chalk.red('Error in SQL Serverr Connection Pool:'))
          log.error(chalk.red(err))
        })

        pool.connect(function (err) {
          if (err) {
            initialised = false
            reject(err)
            log.error(chalk.red('Error connecting to SQL Server:'))
            log.error(chalk.red(err))
          } else {
            resolve(true)
            log.info(chalk.blue('SQL Server connection established.'))
          }
        })
      } else if (action === 'close') {
        const pool = new mssql.ConnectionPool(connConfig)
        pool.close(function (err) {
          if (err) {
            initialised = false
            reject(err)
            log.error(chalk.red('Error connecting to SQL Server:'))
            log.error(chalk.red(err))
          } else {
            resolve(true)
            log.info(chalk.blue('SQL Server connection established.'))
          }
        })
      }
    } catch (error) {
      reject(error)
      log.error(chalk.red('Error connecting to SQL Server:'))
      log.error(chalk.red(err))
    }
  })
}

function _mapType (type, length) {
  let retType = sql.VarChar

  switch (type) {
    case sqlTypes.Bit:
      retType = sql.Bit
      break
    case sqlTypes.BigInt:
      retType = sql.BigInt
      break
    case sqlTypes.Int:
      retType = sql.Int
      break
    case sqlTypes.TinyInt:
      retType = sql.TinyInt
      break
    case sqlTypes.Numeric:
      retType = sql.Numeric
      break
    case sqlTypes.Money:
      retType = sql.Money
      break
    case sqlTypes.Double:
      retType = sql.Double
      break
    case sqlTypes.SmallInt:
      retType = sql.SmallInt
      break
    case sqlTypes.Float:
      retType = sql.Float
      break
    case sqlTypes.Char:
      retType = sql.Char
      break
    case sqlTypes.DateTime:
      retType = sql.DateTime
      break
    case sqlTypes.Decimal:
      retType = sql.Decimal
      break
    case sqlTypes.Text:
      retType = sql.Text
      break
  }

  if (length) {
    retType = retType(length)
  }

  return retType
}

module.exports = new IDbEngine.DbEngine(
  { engine: 'sqlserver', table_prefix: 'DBA_' },
  isInitialised,
  init,
  sqlExec,
  resolveSQL
)
