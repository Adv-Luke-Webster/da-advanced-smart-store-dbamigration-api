const _ = require('underscore')
const moment = require('moment')
const IDbEngine = require('../../modules/dbengines/IDbEngine')
const dbEngineLib = require('../../modules/dbengines/dbEngineLib')
const log = require('../../helper/logger')
const chalk = require('chalk')
const statements = require('../../modules/sqlStatements')

// Need this to get the SQL Server data types, which we are using for all database engines.
// const sql = require("mssql/msnodesqlv8");
const sql = require('../../modules/dbengines/SqlDataTypes.js').sqlTypes

// The Oracle library (v2.0 or above).
const oracledb = require('oracledb')
const { reject, result } = require('underscore')

// static properties:
oracledb.autoCommit = true
oracledb.outFormat = oracledb.OBJECT
oracledb.fetchAsString = [oracledb.CLOB]

let initialised = false
let connConfig = {}
let pool = null

function isInitialised () {
  return initialised
}

function getConfig (connString, err) {
  const connObject = connString.split(';')
  // Some examples of jdbc connection strings for Oracle.
  // Will assume that user/password are not embedded in the jdbc connection string
  // jdbc:oracle:thin:@<host>[:<port>]:<SID>          (archaic - the oracledb driver does not directly support SIDs, so we cannot support this.)
  // jdbc:oracle:thin:@[//]<host>[:<port>]/<service>    (an "easy connect" string - can use this directly)
  // jdbc:oracle:thin:@<TNSName>                      (an entry in the tnsnames.ora file (for example) - again we can use this directly)
  // jdbc:oracle:oci:@myhost:1521:orcl                (different underlying implemnetations (thin/oci/oci8). We don't need to look at this)
  // jdbc:oracle:oci8:@hostname_orcl
  // jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST=<host>)(PORT=<port>))(CONNECT_DATA=(SERVICE_NAME=<service>)))
  //                                                  (tnsnames.ora style syntax. Again, we can use directly.)
  // The general syntax of an easy connect string is:
  // [//]host_name[:port][/service_name][:server_type][/instance_name]
  if (connString.substr(0, 12) !== 'jdbc:oracle:' || connString.indexOf('@') < 0) {
    return ({ message: 'The JDBC connection string is not valid for Oracle Server' })
  }
  const connBits = connString.split(':')[3]
  const user = connBits.split('/')[0]
  let password = connBits.split('/')[1]
  password = password.split('@')[0]
  connString = connBits.split('@')[1]
  connConfig = {
    user,
    password,
    connectString: connString,
    poolMin: (connString.sqlConnectionPoolMin || (connString.sqlConnectionPoolMin === 0)) ? connString.sqlConnectionPoolMin : 3,
    poolMax: connString.sqlConnectionPoolMax ? connString.sqlConnectionPoolMax : 50
  }
}

function init (connString, action) {
  return new Promise((resolve, reject) => {
    try {
      validConfig = getConfig(connString)
      if (validConfig?.message) {
        reject(validConfig.message)
      }

      if (action === 'open') {
        oracledb.createPool(connConfig)
          .then(function (pl) {
            pool = pl
            log.info(chalk.blue('Connected to Oracle OK'))
            process.on('beforeExit', function () {
              log.info(chalk.blue('Closing connections to Oracle'))
              pool.close()
              initialised = false
            })
            resolve()
          })
          .catch(function (err) {
            initialised = false
            reject(err.message)
            log.error(chalk.red('Error Connecting to Oracle:'))
            log.error(chalk.red(JSON.stringify(err.message)))
          })
      } else if (action === 'close') {
        const pool = new mssql.ConnectionPool(connConfig)
        pool.close(function (err) {
          if (err) {
            initialised = false
            reject(err.message)
            log.error(chalk.red('Error connecting to Oracle Server:'))
            log.error(chalk.red(err))
          } else {
            resolve(true)
            log.info(chalk.blue('Oracle Server connection established.'))
          }
        })
      }
    } catch (error) {
      reject(error)
      log.error(chalk.red('Error connecting to Oracle Server:' + error))
    }
  })
}

function sqlExec (connString, st) {
  sqlStatement = st
  ct = connString
  return new Promise((resolve, reject) => {
    validConfig = getConfig(connString)
    if (validConfig.message) {
      reject(validConfig.message)
    }
  })
}

function cleanup (context, success) {
  if (context.conn) {
    context.conn.close()
    context.conn = null
  }
  return q(context.data)
}

function _oracleParams (params) {
  const op = {}

  _.each(params, function (param, key) {
    const value = _oracleCleanValue(param.value, param.type)
    op[key] = {
      // type: _oracleParamTypes(param.type),
      val: value
    }
    if (param.direction && (param.direction & dbEngineLib.direction.OUT) > 0) {
      op[key].type = _oracleParamTypes(param.type)
      op[key].dir = param.direction == dbEngineLib.direction.INOUT ? oracledb.BIND_INOUT : oracledb.BIND_OUT
    }
  })
  return op
}

function _oracleParamTypes (mssqlType) {
  let retType = oracledb.STRING // (2001) Bind as JavaScript String type.  Can be used for most database types.
  switch (mssqlType) {
    case sql.Bit:
      // there is no oracledb.BOOLEAN We are using Number(1,0)

    case sql.BigInt:
    case sql.Decimal:
    case sql.Float:
    case sql.Int:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallInt:
      // case sql.SmallMoney:
      // case sql.Real:
    case sql.TinyInt:
      retType = oracledb.NUMBER // (2002) Bind as JavaScript number type.
      break

      // case sql.Char:
      // case sql.NChar:
      // case sql.Text:
      // case sql.NText:
      // case sql.VarChar:
      // case sql.NVarChar:
      // case sql.Xml:

      // case sql.Time:
      // case sql.Date:
    case sql.DateTime:
      // case sql.DateTime2:
      // case sql.DateTimeOffset:
      // case sql.SmallDateTime:
      retType = oracledb.DATE // (2003) Bind as JavaScript date type.
      break

      // case sql.UniqueIdentifier:

      // case sql.Variant:

    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      retType = oracledb.BLOB // (2007) Bind a BLOB to a Node.js Stream or create a temporary BLOB
      // retType = oracledb.BUFFER                 // (2005) Bind a RAW, LONG RAW or BLOB to a Node.js Buffer
      // retType = oracledb.CLOB                   // (2006) Bind a CLOB to a Node.js Stream, create a temporary CLOB
      break

        // case sql.UDT:
        // case sql.Geography:
        // case sql.Geometry:

        // oracledb.CURSOR                 // (2004) Bind a REF CURSOR to a node-oracledb ResultSet class
        // oracledb.DEFAULT                // (0) Used with fetchInfo to reset the fetch type to the database type
  }
  return retType
}

function _oracleCleanValue (ipValue, type) {
  let value = ipValue
  switch (type) {
    case sql.Bit:
      if (_.isBoolean(ipValue) || _.isNumber(ipValue)) {
        value = (ipValue ? 1 : 0)
      }
      break
    case sql.Int:
    case sql.SmallInt:
    case sql.TinyInt:
      value = parseInt(ipValue)
      if (isNaN(value)) {
        value = null
      }
      break
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      value = parseFloat(ipValue)
      if (isNaN(value)) {
        value = null
      }
      break
    case sql.DateTime:
      if (ipValue === '') {
        value = null
      } else if (ipValue) {
        value = moment(ipValue).toDate()
        if (isNaN(value.valueOf())) {
          value = null
        }
      }
      break
  }

  return value
}

function simpleExec (context, st) {
  const deferred = q.defer()

  try {
    const bpar = _oracleParams(st.params)
    const bopts = {}

    // log.info("executing: " + st.statement.substr(0,50).replace("\n", " "))
    context.conn.execute(st.statement, bpar, bopts, function (err, result) {
      // log.info("completed: " + st.statement.substr(0,50).replace("\n", " "))
      if (err) {
        deferred.reject(err)
        log.error(chalk.red(err))
        log.info(chalk.blue(JSON.stringify(params)))
      } else {
        if (result.outBinds) {
          /* {
                        ids: [ 1001, 1002 ],
                        rids: [ 'AAAbvZAAMAAABtNAAA', 'AAAbvZAAMAAABtNAAB' ] }
                    */
          outRows = []
          _.each(result.outBinds, function (values, name) {
            _.each(values, function (value, iX) {
              if (outRows.length <= iX) {
                outRows[iX] = {}
              }
              outRows[iX][name] = value
            })
          })
          if (result.rows && result.rows.length > 0) {
            context.data = [
              { recordset: outRows, rowsAffected: outRows.length },
              { recordset: result.rows, rowsAffected: result.rows.length }
            ]
          } else {
            context.data = { recordset: outRows, rowsAffected: outRows.length }
          }
        } else {
          context.data = { recordset: result.rows ? result.rows : [], rowsAffected: result.rows ? result.rows.length : result.rowsAffected }
        }
        deferred.resolve(context)
      }
    })
  } catch (e) {
    deferred.reject(e)
  }

  return deferred.promise
}

function resolveSQL (sqlDef) {
  return dbEngineLib.resolveSQL(sqlDef, 'oracle', 'QQQ').then(function (st) {
    const rx = /\@([A-Za-z0-9\$\#_]+)/g // Find SQL identifier words starting with @ so we can change to oracle ":param" syntax
    const rxF = /\bFALSE\b/ig // Our statments use the ANSI standard TRUE and FALSE constants for booleans.
    // Oracle has no boolean data type, so we must use 0 and 1
    const rxT = /\bTRUE\b/ig

    if (_.isArray(st)) {
      st = _.map(st, function (def, ix) { return { statement: def.statement.replace(rx, ':$1').replace(rxF, '0').replace(rxT, '1'), params: def.params } })
    } else {
      st.statement = st.statement.replace(rx, ':$1').replace(rxF, '0').replace(rxT, '1')
    }
    return st
  })
}

module.exports = new IDbEngine.DbEngine(
  { engine: 'oracle', table_prefix: 'QQQ_' },
  isInitialised,
  init,
  sqlExec,
  simpleExec,
  resolveSQL
)
