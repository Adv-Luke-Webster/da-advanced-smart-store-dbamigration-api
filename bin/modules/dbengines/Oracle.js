
const _ = require('underscore')
const moment = require('moment')
const IDbEngine = require('../../modules/dbengines/IDbEngine')
const dbEngineLib = require('../../modules/dbengines/dbEngineLib')
const path = require('path')

// Logger
// const logger = require("v1-Smart-Logger/src/logProcessor.js");        // log processor
// const chalk = require("chalk");
let log

// Need this to get the SQL Server data types, which we are using for all database engines.
// const sql = require("mssql/msnodesqlv8");
const sql = require('../../modules/dbengines/SqlDataTypes.js').sqlTypes

// The Oracle library (v2.0 or above).
const oracledb = require('oracledb')

// static properties:
oracledb.autoCommit = true
oracledb.outFormat = oracledb.OBJECT
oracledb.fetchAsString = [oracledb.CLOB]

let initialised = false
let connConfig = {}
let pool = null

if (_.isUndefined(log)) {
  // log = logger.setUpLogs(config, path.join(__dirname, "..", "..", "..", "logs"));
}

function isInitialised () {
  return initialised
}

function init (instance) {
  // var deferred = q.defer();

  try {
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
    if (instance.substr(0, 12) !== 'jdbc:oracle:' || instance.indexOf('@') < 0) {
      const result = ({ message: 'The JDBC connection string is not valid for Oracle' })
      return result
    }

    /*
        Configuration Object:
String user
String password
String connectString
Boolean externalAuth
Number stmtCacheSize
String poolAlias
Number poolIncrement
Number poolMax
Number poolMin
Number poolPingInterval
Number poolTimeout
Boolean queueRequests
Number queueTimeout
        */
    const connBits = instance.split(':')[3]
    const user = connBits.split('/')[0]
    let password = connBits.split('/')[1]
    password = password.split('@')[0]
    const connString = connBits.split('@')[1]
    connConfig = {
      user,
      password,
      connectString: connString,
      poolMin: (instance.sqlConnectionPoolMin || (instance.sqlConnectionPoolMin === 0)) ? instance.sqlConnectionPoolMin : 3,
      poolMax: instance.sqlConnectionPoolMax ? instance.sqlConnectionPoolMax : 50
    }

    if (!initialised) {
      initialised = true
      // log.info(chalk.blue("Connecting to Oracle..."));
      oracledb.createPool(connConfig)
        .then(function (pl) {
          pool = pl
          // log.info(chalk.blue("Connected to Oracle OK"));
          process.on('beforeExit', function () {
            // log.info(chalk.blue("Closing connections to Oracle"));
            pool.close()
            initialised = false
          })
          deferred.resolve()
        })
        .catch(function (err) {
          initialised = false
          deferred.reject(err)
          // log.error(chalk.red("Error Connecting to Oracle:"));
          // log.error(chalk.red(JSON.stringify(err)));
        })
    }
  } catch (e) {
    // deferred.reject(e);
  }

  return deferred.promise
}

function initConnection () {
  return pool.getConnection().then(function (conn) {
    return { conn }
  })
}

function cleanup (context, success) {
  if (context.conn) {
    context.conn.close()
    context.conn = null
  }
  return q(context.data)
}

function tableOrColumnExists (context, tableName, columnName, noPrefix) {
  const deferred = q.defer()

  try {
    if (!noPrefix) {
      tableName = 'QQQ_' + tableName
    }

    const owner = config.get('DatabaseInstances')[0].jdbcUser
    context.conn.execute('select TABLE_NAME from ALL_TABLES' +
                "\n where  TABLESPACE_NAME = 'USERS'" +
                '\n and OWNER = :owner' +
                '\n and TABLE_NAME = :tableName',
    { tableName: tableName.toUpperCase(), owner: owner.toUpperCase() })
      .then(function (result) {
        const ret = { tableExists: false, columnExists: false }
        if (result && result.rows.length > 0) {
          ret.tableExists = true

          if (typeof (columnName) !== 'undefined' && columnName) {
            context.conn.execute('select COLUMN_NAME from ALL_TAB_COLUMNS' +
                            '\n where TABLE_NAME = :tableName' +
                            '\n and COLUMN_NAME = :columnName' +
                            '\n and OWNER = :owner',
            { tableName: tableName.toUpperCase(), columnName: columnName.toUpperCase(), owner: owner.toUpperCase() })
              .then(function (result) {
                if (result && result.rows.length > 0) {
                  ret.columnExists = true
                }
                context.data = ret
                deferred.resolve(context)
              })
              .catch(function (err) {
                deferred.reject(err)
                log.error(chalk.red(err))
              })
          } else {
            context.data = ret
            deferred.resolve(context)
          }
        } else {
          context.data = ret
          deferred.resolve(context)
        }
      })
      .catch(function (err) {
        deferred.reject(err)
        log.error(chalk.red(err))
      })
  } catch (e) {
    deferred.reject(e)
  }

  return deferred.promise
  /*
select table_name from information_schema.tables where table_name = 'qqq__blobs' and table_schema = 'public'
select column_name from information_schema.columns where table_name = 'qqq__blobs' and column_name = 'location' and table_schema = 'public'
    */
}

function indexExists (context, tableName, columns, noPrefix) {
  const deferred = q.defer()
  const owner = config.get('DatabaseInstances')[0].jdbcUser
  try {
    const ret = { tableExists: false, indexExists: false, isUnique: false, indexName: '', indexAllowed: true }

    tableOrColumnExists(context, tableName, columns[0], noPrefix).then(function (texists) {
      if (texists.data.tableExists && texists.data.columnExists) {
        ret.tableExists = true

        if (!noPrefix) {
          tableName = 'QQQ_' + tableName
        }

        const sSQL = 'select i.INDEX_NAME as "index_name",' +
                    '\n ic.COLUMN_NAME as "name"' +
                    '\n from ALL_INDEXES i' +
                    '\n join ALL_IND_COLUMNS ic' +
                    '\n     on i.INDEX_NAME = ic.INDEX_NAME' +
                    '\n where i.TABLE_NAME = :tableName' +
                    '\n and i.TABLE_OWNER = :owner' +
                    '\n order by i.INDEX_NAME'

        return context.conn.execute(sSQL, { tableName: tableName.toUpperCase(), owner: owner.toUpperCase() }).then(function (results) {
          context.data = dbEngineLib.buildIndexRet(ret, results.rows, columns)
          deferred.resolve(context)
        })
      } else {
        ret.indexAllowed = false
        context.data = ret
        deferred.resolve(context)
      }
    })
      .catch(function (err) {
        deferred.reject(err)
        log.error(chalk.red(err))
      })
  } catch (e) {
    deferred.reject(e)
  }

  return deferred.promise
}

function createIndex (context, tableName, columns, indexName, isUnique, noPrefix) {
  const deferred = q.defer()

  try {
    if (!noPrefix) {
      tableName = 'QQQ_' + tableName
    }

    if (indexName.length > 30) {
      indexName = indexName.substr(0, 28) + indexName.length
    }

    log.info('Creating index on ' + tableName + ' (' + columns.join(',') + ')')

    const sSQL = 'create ' + (isUnique ? 'unique ' : '') + 'index ' + indexName + ' on ' + tableName + ' (' + (columns.join(',')) + ')'

    context.conn.execute(sSQL).then(function () {
      deferred.resolve(context)
      log.info('Index created on ' + tableName + ' (' + columns.join(',') + ')')
    })
      .catch(function (err) {
        deferred.reject(err)
        log.error('SQL Error creating index on ' + tableName + ' (' + columns.join(',') + '):')
        log.error(chalk.red(err))
      })
  } catch (e) {
    deferred.reject(e)
    log.error('Error creating index on ' + tableName + ' (' + columns.join(',') + '):')
    log.error(chalk.red(e))
  }

  return deferred.promise
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

function batchTxnExec (context, sts) {
  const deferred = q.defer()

  try {
    const psts = []
    const bopts = { autoCommit: false }

    _.each(sts, function (st, iX) {
      const bpar = _oracleParams(st.params)
      psts.push(context.conn.execute(st.statement, bpar, bopts))
    })
    // psts.push();

    q.all(psts)
      .then(function (results) {
        return context.conn.commit().then(function () {
          context.data = _.map(results, function (result) {
            return {
              recordset: (result && result.rows) ? result.rows : [],
              rowsAffected: result ? (result.rows ? result.rows.length : result.rowsAffected) : 0
            }
          })

          deferred.resolve(context)
        })
      })
      .catch(function (err) {
        try {
          context.conn.rollback()
        } catch (e) {}

        deferred.reject(err)
        log.error(chalk.red(err))
      })
  } catch (e) {
    try {
      context.conn.rollback()
    } catch (e) {}
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
  initConnection,
  // prepare,
  // executeFetchList,
  cleanup,
  tableOrColumnExists,
  indexExists,
  createIndex,
  simpleExec,
  batchTxnExec,
  resolveSQL
)
