
const _ = require('underscore');
const moment = require('moment');
const { parseConnectionString } = require('@tediousjs/connection-string');

var path = require('path');
var statements = require("../modules/sqlStatements");
const { parse } = require('path');

//Logger
//const logger = require("v1-Smart-Logger/src/logProcessor.js");        // log processor
//const chalk = require("chalk");
var log;


if (_.isUndefined(log)) {
    //log = logger.setUpLogs(config, path.join(__dirname, "..", "..", "logs"));
}

var _dbs = [];

function getDb(ct) {
    let _db;
    let _server;
    let _intergratedSecurity;
    let _username;
    let _password;

    if (_.isString(ct)) {
        jdbcBits = ct.split(":");
        let engine = jdbcBits.length > 1 ? jdbcBits[1] : "";
        let connObject = ct.split(";");

        if(engine==="sqlserver"){
            for(let i =0; i < connObject.length; i++){
                if(connObject[i].includes("databaseName")){
                    _db = connObject[i].split("=")[1];
                    console.log(_db);
                }
                if(connObject[i].includes("integratedSecurity")){
                    _intergratedSecurity = connObject[i].split("=")[1];
                    console.log(_intergratedSecurity);
                    
                }
                if((connObject[i].includes("user")) || (connObject[i].includes("userName"))){
                    _username = connObject[i].split("=")[1];
                    console.log(_username);
                    
                }
                if(connObject[i].includes("password")){
                    _password = connObject[i].split("=")[1];
                    console.log(_password);
                    
                }
                if(connObject[i].includes("jdbc")){
                    _server = connObject[i].split("//")[1];
                    console.log(_server);
                }
            }
        }

        switch (engine)
        {
            case "sqlserver":
                //if (_.isUndefined(_db)) {
                    if (_db) {
                    try {
                        _db = require("./dbengines/SqlServer.js");
                    }
                    catch(e)
                    {                            
                        log.error(chalk.red("Error loading ./dbengines/SqlServer.js: " + e));                            
                        if (debugMode)
                        {
                            log.error(chalk.red(e.stack));
                        }
                        deferred.reject(e);
                        return;
                    }
                }
                break;
            case "postgresql":
                if (_db) {
                    try {
                        _db = require("./dbengines/PostgreSql.js");
                       
                    }
                    catch(e)
                    {                            
                        log.error(chalk.red("Error loading ./dbengines/PostgreSql.js: " + e));                          
                        if (debugMode)
                        {
                            log.error(chalk.red(e.stack));
                        }
                        deferred.reject(e);
                        return;
                    }
                }
                break;
            case "oracle":
                if (_.isUndefined(_db)) {
                    try {
                        _db = require("./dbengines/Oracle.js");
                    }
                    catch(e)
                    {                            
                        log.error(chalk.red("Error loading ./dbengines/Oracle.js: " + e));                          
                        if (debugMode)
                        {
                            log.error(chalk.red(e.stack));
                        }
                        deferred.reject(e);
                        return;
                    }
                }
                break;
            default:
                deferred.reject({ message: "Could not resolve a database handler for engine '" + engine + "'"});
                break;
        }

//let _db = _dbs[instanceName];
   }
    return _db  //deferred.promise;
}

var sqlRunSQL = function(ct, st) {
    var deferred = q.defer();
    var context = null;
    getDb(ct).then(function(db) {    
        return db.initConnection().then(function(context1) {
            context = context1;
            var fExec = _.isArray(st) ? db.batchTxnExec : db.simpleExec;
            return fExec(context1, st).then(function(context2) {
                context = context2;
                deferred.resolve(db.cleanup(context2, true));
            })
            .catch(function(err) {
                if (context)
                    db.cleanup(context, false);
                log.error(chalk.red("SQL Error: " + (err.message ? err.message : err)));
                deferred.reject(err);
            });
        });
    })
    .catch(function(err) {
        log.error(chalk.red("Database Access Error: " + (err.message ? err.message : err)));
        deferred.reject(err);
    });

    return deferred.promise;
};

var tableOrColumnExists = function(ct, tableName, columnName, noPrefix) {
    var context = null;
    return getDb(ct).then(function(db) {    
        return db.initConnection().then(function(context1) { 
            context = context1;
            return db.tableOrColumnExists(context1, tableName, columnName, noPrefix).then(function(context2) {
                context = context2;
                return db.cleanup(context2, true);
            })
            .catch(function(err) {
                if (context)
                    db.cleanup(context, false);
                log.error(chalk.red("SQL Error: " + (err.message ? err.message : err)));
            });
        });
    })
    .catch(function(err) {
        log.error(chalk.red("Database Access Error: " + (err.message ? err.message : err)));
    });
};

var resolveSQL = function(ct, sqlDef) {  
    // For some reason I was finding that returning the chain of promises was not 
    // passing back as rejected, promises rejected in db.resolveSQL. Switched to this more verbose
    // format, which behaves as expected. 
    var deferred = q.defer();

    getDb(ct).then(function(db) {    
        db.resolveSQL(sqlDef).then(function(statement) {
            deferred.resolve(statement);
        },
        function(err) {
            deferred.reject(err);
        });
    })
    .catch(function(err) {
        deferred.reject(err);
        log.error(chalk.red("Database Access Error: " + (err.message ? err.message : err)));
    });

    return deferred.promise;
};
/*
var initConnection = function(ct) {
    
    return getDb(ct).then(function(db) {    
        return db.initConnection().then(function(context) {
            context.db = db;
            return context;
        });
    })
    .catch(function(err) {
        log.error(chalk.red("Database Access Error: " + (err.message ? err.message : err)));
    });
};

var prepare = function(context, sqlStatement, params) {      
    return context.db.prepare(context, sqlStatement, params)
    .catch(function(err) {
        log.error(chalk.red("Error preparing SQL statement: " + (err.message ? err.message : err)));
    });
};

var executeFetchList = function(context, params) {      
    return context.db.executeFetchList(context, params)
    .catch(function(err) {
        log.error(chalk.red("Error executing SQL statement: " + (err.message ? err.message : err)));
    });
};

var cleanup = function(context, success) {      
    return context.db.cleanup(context, success);
};
*/
var getEngineDetails = function(ct) {    
    return getDb(ct).then(function(db) {   
        return db.engineDetails;
    }); 
};

var checkCreateTable = function(ct, tableName, createStatement) {
    
    var deferred = q.defer();

    tableOrColumnExists(ct, tableName).then(function(exists) {
        if (!exists.tableExists) {
            return resolveSQL(ct, createStatement).then(function(st){
                return sqlRunSQL(ct, st).then(function() {
                    deferred.resolve();
                });
            });
        }
        else {
            deferred.resolve();
        }
    })
    .catch(function (err) {
        log.error(chalk.red(err));
        deferred.reject(err);
    });

    return deferred.promise;
};

var checkCreateIndex = function(ct, tableName, columns, indexName, unique) {

    var context = null;
    return getDb(ct).then(function(db) {    
        return db.initConnection().then(function(context1) { 
            context = context1;
            return db.indexExists(context1, tableName, columns).then(function(context2) {
                context = context2;             
                if (!context2.data.indexExists && context2.data.indexAllowed) {
                    return db.createIndex(context2, tableName, columns, indexName, unique).then(function(context3){
                        return db.cleanup(context3, true);
                    });
                }
                else {
                    return db.cleanup(context2, true);
                }
            })
            .catch(function(err) {
                if (context)
                    db.cleanup(context, false);
                log.error(chalk.red("SQL Error: " + (err.message ? err.message : err)));
            });
        });
    })
    .catch(function(err) {
        log.error(chalk.red("Database Access Error: " + (err.message ? err.message : err)));
    });
}

var getTables = function(ct) {

    var deferred = q.defer();

    resolveSQL(ct, statements.utility.getTables).then(function(stt){
        return resolveSQL(ct, statements.utility.getTableColumns).then(function(stc){
            return sqlRunSQL(ct, stt).then(function(tableData) {
                return sqlRunSQL(ct, stc).then(function(columnData) {
                    var tables = tableData.recordset;
                    var columns = columnData.recordset;

                    var tabIx = 0;
                    var table = tables[tabIx];
                    if (!table.displayName) {
                        table.displayName = table.name;
                    }
                    table.columns = [];

                    for (var colIx = 0; colIx < columns.length; colIx++) {
                        var column = columns[colIx];
                        while (column.tableName != table.name && tabIx < tables.length) {
                            tabIx++;
                            table = tables[tabIx];
                            if (!table.displayName) {
                                table.displayName = table.name;
                            }
                            table.columns = [];
                        }
                        if (column.tableName == table.name) {
                            if (!column.displayName) {
                                column.displayName = column.name;
                            }
                            table.columns.push(column);
                        }
                    }

                    deferred.resolve(tables);
                });
            });
        });
    })
    .catch(function (err) {
        log.error(chalk.red(err));
        deferred.reject(err);
    });

    return deferred.promise;
};

module.exports = {
    
    // Commonly used statements for running SQL over the database. 
    // Functions return promises, and they take care of cleaning up
    // connections, etc, after they have run, so you don't have to.
    // for sqlRunSQL, passing an array of statements will cause them 
    // to be run inside a database transaction.
    sqlRunSQL: sqlRunSQL,
    tableOrColumnExists: tableOrColumnExists,
    resolveSQL: resolveSQL,   
    
    // Lower level functions for accessing separate prepare/execute
    // etc. For use where the basic wrapper functions above are inadequate for
    // a more complex requirement. Note that when using these the code is responsible
    // for resolving the promises, error handling and ensuring that cleanup is always run
    // passing the correct context object whether the routine succeeded or failed.
    //
    // The general structure for using these is as follows:
    //
    // var context;
    // return archiveSQL.initConnection(ct).then(function(context1){
    //     context = context1;
    //     return archiveSQL.prepare(context1, sqlStatement, params).then(function(context2) {
    //         context = context2;
    //         return archiveSQL.executeFetchList(context2, params).then(function(context3) {
    //             context = context3;
    //             return archiveSQL.cleanup(context3, true);
    //         });
    //     });
    // })
    // .catch(function(err) {
    //     if (context)
    //         archiveSQL.cleanup(context, false);
    //     log.error(chalk.red("SQL Error: " + (err.message ? err.message : err)));
    // });
    // Removed these because they are not being used and don't yet work properly.
    // initConnection: initConnection,
    // prepare: prepare,
    // executeFetchList: executeFetchList,
    // cleanup: cleanup,
    
    // Utility functions:
    getEngineDetails: getEngineDetails,
    checkCreateTable: checkCreateTable,
    checkCreateIndex: checkCreateIndex,
    getTables: getTables,
    getDb: getDb
};