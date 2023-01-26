
const _ = require('underscore');
const moment = require('moment');
const IDbEngine = require("../../modules/dbengines/IDbEngine")
const dbEngineLib = require("../../modules/dbengines/dbEngineLib")
const path = require('path');

//Logger
//const logger = require("v1-Smart-Logger/src/logProcessor.js");        // log processor
//const chalk = require("chalk");
var log;

// The Postgre Sql promise based library, with default options.
const pgp = require('pg-promise')();
const PS = require('pg-promise').PreparedStatement;
var db = null;

var initialised = false,
connConfig = {}
// pool = null;

if (_.isUndefined(log)) {
    //log = logger.setUpLogs(config, path.join(__dirname, "..", "..", "..", "logs"));
}

function isInitialised() {
    return initialised;
}

function init(instance) {

    var deferred = q.defer();

    try {
        // Structure of jdbc connection string for Postgre. There can be slimmer ones, but we'll assume we're being given at least a host.
        // jdbc:postgresql://host[:port][/database][?opt1=val1[&opt2=val2]...]
        if (instance.jdbcURL.substr(0, 18) != 'jdbc:postgresql://')
        {
            deferred.reject({ message: "The JDBC connection string is not valid for Postgre SQL"})
        }
        
        /*
        Configuration Object:
string host - server name or IP address
number port - server port number
string database - database name
string user - user name
string password - user password
boolean ssl - use SSL
boolean binary - binary result mode
string client_encoding 
string application_name 
string fallback_application_name 
number poolSize - maximum size of the connection pool
number idleTimeoutMillis - lifespan for unused connections
        */
        connConfig = {
            user: instance.jdbcUser,
            password: instance.jdbcPass,
            application_name: "NIS" //,
            // error: function (error, e) { }         
        }
        
        var qBits = instance.jdbcURL.split('?');
        var location = qBits[0].substr(18) ; // = "host[:port]/database"
        var aBits = location.split('/');
        var hostBits = aBits[0].split(":");
        connConfig.host = hostBits[0];
        if (hostBits.length > 1)
            connConfig.port = hostBits[1];
        if (aBits.length > 1)
            connConfig.database = aBits[1];    
            
        if (qBits.length > 1) {
            qBits = qBits.split('&');
            _.each(function(prop, iX){
                var nvp = prop.split("=");
                switch (nvp[0].toLowerCase()) 
                {
                    case "ssl":
                        connConfig.ssl = true;
                        break;
                }
            });
        }

        db = pgp(connConfig);
        
        if (!initialised) {
            initialised = true;
            log.info(chalk.blue("Connecting to Postgre SQL..."));
            db.connect()
                .then(function(dbo) {
                    dbo.done();
                    log.info(chalk.blue("Connected to Postgre SQL OK"));
                    deferred.resolve();  
                })
                .catch(function(err){
                    initialised = false;
                    deferred.reject(err);
                    log.error(chalk.red("Error Connecting to Postgre SQL:"));
                    log.error(chalk.red(JSON.stringify(err)));
                });
        }
    }
    catch(e) {
        deferred.reject(e);
    }

    return deferred.promise;
}

     
function initConnection() {
    return q({conn: true}); 
}
/*
function prepare(context, sqlStatement, params){

    var deferred = q.defer(); 

    try
    {
        if (sqlStatement) {
            var stmtName = "_stmt_" + Math.round(Math.random() * 1000000);
            var ps = new PS(stmtName, sqlStatement);
            context.stmt = ps;
            
            deferred.resolve(context);
        }
        else {
            deferred.reject("Empty SQL Statement");
        }
    }
    catch(e) {
        deferred.reject(e);
    }

    return deferred.promise;
}
*/
function executeFetchList(context, params) {

    var deferred = q.defer(); 

    try
    {
        var bpar = _postgreParams(params);

        db.result(context.stmt, bpar).then(function(result) {    
            //resultsToLower(result.rows);              
            context.data = { recordset: result.rows, rowsAffected: result.rowCount };
            deferred.resolve(context);
        })
        .catch(function (err) {
            deferred.reject(err);
            log.error(chalk.red(err));
            log.info(chalk.blue(JSON.stringify(params)));
        });
    }
    catch(e) {
        deferred.reject(e);
    }
    
    return deferred.promise;
}


function cleanup(context, success) {
    return q(context.data);
}
    
function tableOrColumnExists(context, tableName, columnName, noPrefix) {

    var deferred = q.defer();
    
    try
    {
        if (!noPrefix) {
            tableName = "qqq_" + tableName;
        }

        db.oneOrNone("select table_name from information_schema.tables"
                + " where table_name = ${tableName}"
                + " and table_schema = 'public'", 
                {tableName: tableName.toLowerCase()} )
            .then(function(result) {                        
                var ret = {tableExists: false, columnExists: false};
                if (result && result.table_name) {
                    ret.tableExists = true;

                    if (typeof(columnName) !== "undefined" && columnName) {
                        
                        db.oneOrNone("select column_name from information_schema.columns"
                            + " where table_name = ${tableName}"
                            + " and column_name = ${columnName}"
                            + " and table_schema = 'public'", 
                            {tableName: tableName.toLowerCase(), columnName: columnName.toLowerCase()})
                        .then(function(result) { 
                            if (result && result.column_name) {
                                ret.columnExists = true;
                            }
                            context.data = ret;
                            deferred.resolve(context);
                        })
                        .catch(function(err) {    
                            deferred.reject(err);
                            log.error(chalk.red(err));
                        });
                    }
                    else {
                        context.data = ret;
                        deferred.resolve(context);
                    }
                }
                else {
                    context.data = ret;
                    deferred.resolve(context);
                }
             
            }) 
            .catch(function(err) {            
                deferred.reject(err);
                log.error(chalk.red(err));
            });
    }
    catch(e)
    {
        deferred.reject(e);
    }
    
    return deferred.promise;
    /*
select table_name from information_schema.tables where table_name = 'qqq__blobs' and table_schema = 'public'
select column_name from information_schema.columns where table_name = 'qqq__blobs' and column_name = 'location' and table_schema = 'public'
    */
}

function indexExists(context, tableName, columns, noPrefix) {

    var deferred = q.defer();

    try
    {
        var ret = {tableExists: false, indexExists: false, isUnique: false, indexName: "", indexAllowed: true};

        tableOrColumnExists(context, tableName, columns[0], noPrefix).then(function(texists) {

            if (texists.data.tableExists && texists.data.columnExists) {
                ret.tableExists = true;
                        
                if (!noPrefix) {
                    tableName = "qqq_" + tableName;
                }
                
                var sSQL = "select ix.indisunique as \"is_unique\","
                    + "\n	    ix.indexrelid as \"index_id\","
                    + "\n	    i.relname as \"index_name\","
                    + "\n	    a.attname as \"name\""
                    + "\n	from pg_class t"
                    + "\n	join pg_index ix"
                    + "\n	    on t.oid = ix.indrelid"
                    + "\n	join pg_class i"
                    + "\n	    on i.oid = ix.indexrelid"
                    + "\n	join pg_attribute a"
                    + "\n	    on a.attrelid = t.oid"
                    + "\n	    and a.attnum = ANY(ix.indkey)"
                    + "\n	where"
                    + "\n	    t.relkind = 'r'"
                    + "\n	    and t.relname = ${tableName}"
                    + "\n	order by"
                    + "\n	    t.relname,"
                    + "\n	    i.relname";

                return db.any(sSQL, {tableName: tableName.toLowerCase()}).then(function(results) { 
                    
                    context.data = dbEngineLib.buildIndexRet(ret, results, columns);
                    deferred.resolve(context);
                });
            }
            else {
                ret.indexAllowed = false;
                context.data = ret;
                deferred.resolve(context);
            }
        }) 
        .catch(function(err) {            
            deferred.reject(err);
            log.error(chalk.red(err));
        });
    }
    catch(e)
    {
        deferred.reject(e);
    }

    return deferred.promise;
}

function createIndex(context, tableName, columns, indexName, isUnique, noPrefix) {
    
    var deferred = q.defer();
    
    try
    {
        if (!noPrefix) {
            tableName = "qqq_" + tableName;
        }

        log.info("Creating index on " + tableName + " (" + columns.join(",") + ")");

        var sSQL = "create " + (isUnique ? "unique " : "") + "index " + indexName + " on " + tableName + " (" + (columns.join(",")) + ")";

        db.none(sSQL).then(function(){
            deferred.resolve(context);
            log.info("Index created on " + tableName + " (" + columns.join(",") + ")");
        })
        .catch(function(err){
            deferred.reject(err);
            log.error("SQL Error creating index on " + tableName + " (" + columns.join(",") + "):");
            log.error(chalk.red(err));
        });
    }
    catch(e)
    {
        deferred.reject(e);
        log.error("Error creating index on " + tableName + " (" + columns.join(",") + "):");
        log.error(chalk.red(e));
    }
    
    return deferred.promise;
}
    
function simpleExec(context, st) {
    // for Postgre, we can bypass the prepare stage by setting the prepared statement object variable to be the SQL string. 
    context.stmt = st.statement;
    return executeFetchList(context, st.params);
}

function _postgreParams(params) {
    var bpar = {};
        
    _.each(params, function(value, key) {
        // We are not currently handling "OUT" parameters for Postgre
        if (!value.direction || value.direction != dbEngineLib.direction.OUT) {
            bpar[key] = value.value !== "" ? value.value : null;
        }
    });

    return bpar;
}

function batchTxnExec(context, sts) {
    var deferred = q.defer();

    try {
        db.tx(function(t) {
            var psts = [];
            
            _.each(sts, function(st, iX){
                var bpar = _postgreParams(st.params);
                psts.push(t.result(st.statement, bpar));
            });

            return t.batch(psts);
        })    
            .then(function(results) {    
                // TODO: This is probably not compatible with SQL Server. Needs a test case...          
                context.data = _.map(results, function(result) { return { recordset: result.rows, rowsAffected: result.rowCount } });
                deferred.resolve(context);
            })
            .catch(function (err) {
                deferred.reject(err);
                log.error(chalk.red(err));
            });
    }
    catch(e) {
        deferred.reject(e);
    }
    
    return deferred.promise;
}

// Function that takes an entry from the sqlStatements library and returns
// the pre-processed statement appropriate for the database engine.
// Parameters:
//      sqlDef      An item from the sqlStatements library
// Return, for a single statement:
//      { statement, params } 
//          statement    The SQL statement or statements to be executed, with table names and parameter syntax resolved
//          params          The statement parameters
// for multiple statements, an array of the same structure:
//      [{ statement, params }[,...]] 
function resolveSQL(sqlDef) {
    return dbEngineLib.resolveSQL(sqlDef, "postgresql", "qqq").then(function(st){  
        var rx = /\@([A-Za-z0-9\$\#_]+)/g; // Find SQL identifier words starting with @
        if (_.isArray(st)) {
            st = _.map(st, function(def, ix){ return {statement: def.statement.replace(rx, '${$1}'), params: def.params }; });
        }
        else {
            st.statement = st.statement.replace(rx, '${$1}');         
        }
        return st;
    });
}

module.exports = new IDbEngine.DbEngine(
    {engine: "postgresql", table_prefix: "qqq_"},
    isInitialised,
    init, 
    initConnection, 
    //prepare,
    //executeFetchList,
    cleanup,
    tableOrColumnExists,
    indexExists,
    createIndex,
    simpleExec,
    batchTxnExec,
    resolveSQL
);