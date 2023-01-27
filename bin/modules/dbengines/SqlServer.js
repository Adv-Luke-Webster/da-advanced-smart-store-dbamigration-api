

const _ = require('underscore');
const moment = require('moment');
const IDbEngine = require("../../modules/dbengines/IDbEngine")
const dbEngineLib = require("../../modules/dbengines/dbEngineLib")
const path = require('path');

//Logger
//const logger = require("v1-Smart-Logger/src/logProcessor.js");        // log processor
//const chalk = require("chalk");
var log;

const mssql = require("mssql");

var sqlTypes = require('../../modules/dbengines/SqlDataTypes.js').sqlTypes;

if (_.isUndefined(log)) {
    //log = logger.setUpLogs(config, path.join(__dirname, "..", "..", "..", "logs"));
    console.log("TODO: add logger back in")
}

var initialised = false,
    connConfig = {}
    pool = null;

function isInitialised() {
    return initialised;
}

function init(connString) {
    let connObject = connString.split(";");
    try {
        // Structure of jdbc connection string for SQL Server
        // jdbc:sqlserver://[serverName[\instanceName][:portNumber]][;property=value[;property=value]]
        // This should have a property like: databaseName=DbArchive;
        let _db;
        let _server;
        let _intergratedSecurity;
        let _username;
        let _password;

        if (_.isString(connString)) {
            jdbcBits = connString.split(":");
            let engine = jdbcBits.length > 1 ? jdbcBits[1] : "";
            

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
        }

        if (connString.substr(0, 17) != 'jdbc:sqlserver://')
        {
            return({ message: "The JDBC connection string is not valid for SQL Server"})
        }

        
        connConfig = {
            user: _username,
            password: _password,
            options: {
            },
            pool: {
                min:  3,
                max:  50
            }
        }

        let location = connString.substr(17).split(";")[0]; // = "[serverName[\instanceName][:portNumber]]"
        let instance = location.indexOf("\\");
        if (instance >= 0) {
            connConfig.server = location.substr(0, instance);
            connConfig.options.instanceName = location.substr(instance+1);
        }
        else {
            let portNumber = location.indexOf(":");
            if (portNumber >= 0) {
                connConfig.server = location.substr(0, portNumber);
                connConfig.port = location.substr(portNumber+1);
            }
            else {
                connConfig.server = location;
            }
        }

        for (var i = 1; i < connObject.length; i++) {
            if (connObject[i]) {
                let nvp = connObject[i].split("=");
                let boolValue;
                if (nvp && nvp.length == 2) {
                    switch (nvp[0].toLowerCase()) {
                        case "databasename":
                        case "database":
                            connConfig.database = nvp[1];
                            break;
                        case "servername":
                            connConfig.server = nvp[1];
                            break;
                        case "instancename":
                            connConfig.options.instanceName = nvp[1];
                            break;
                        case "encrypt":
                            boolValue = nvp[1]
                            connConfig.options.encrypt = (boolValue === nvp[1]);
                            break;
                        case "trustservercertificate":
                            boolValue = nvp[1];
                            connConfig.options.trustServerCertificate = (boolValue === nvp[1]);

                            break;                            

                        case "integratedsecurity":
                            if (nvp[1].toLowerCase() == "true") {
                                connConfig.options.trustedConnection = true;
                                connConfig.user = "";
                                connConfig.password = "";
                            }
                            break;
                    }            
                }
            }
        }

        if (!initialised) {
            initialised = true;
            //log.info(chalk.blue("Connecting to SQL Server..."));
            
            new mssql.ConnectionPool(connConfig)
            .connect()
            .then(pool => {
                console.log('Connected')
                return pool
            })
            .catch(err => console.log('Error..',err))
        }
    }
    catch(e) {
       // deferred.reject(e);
        //log.error(chalk.red("Error initialising SQL Server:"));
        console.log("err")
    }

    return pool;
}

function initConnection() {
    return q({conn: true}); 
}
/*
function prepare(context, sqlStatement, params) {   
    var deferred = q.defer(); 

    try
    {
        var ps = new sql.PreparedStatement(pool);

        context.stmt = ps;

        _.each(params, function(value, key) {
            ps.input(key, value.type);        
        });

        if (sqlStatement) {
            ps.prepare(sqlStatement, function(err){ 
                if (err) {   
                    deferred.reject(err);
                    log.error(chalk.red(err));
                    log.info(chalk.blue(sqlStatement));
                }
                else {
                    deferred.resolve(context);
                }
            });
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

function executeFetchList(context, params) {
    
    var deferred = q.defer(); 

    try
    {
        var bpar = {};

        _.each(params, function(value, key) {
            bpar[key] = value.value;        
        });

        context.stmt.execute(bpar, function(err, result) {   
            if (err) {   
                deferred.reject(err);
                log.error(chalk.red(err));
                log.info(chalk.blue(JSON.stringify(params)));
            }
            else {     
                // recordset needs to be the last result, not the first, for compatibility with Postgre
                context.data = { 
                    recordset: result.recordsets.length > 0 ? result.recordsets[result.recordsets.length-1] : [], 
                    rowsAffected: result.rowsAffected 
                };
                deferred.resolve(context);
            }
        });
    }
    catch(e) {
        deferred.reject(e);
    }
    
    return deferred.promise;
}
*/
function cleanup(context, success) {

    var deferred = q.defer();

    try
    {
        var data = context.data ? context.data : {recordset: [], rowsAffected: 0};
        
        if (context.stmt) {
            context.stmt.unprepare(function(err) {
                if (err && err.code != "ENOTPREPARED") { 
                    deferred.reject(err);
                    log.error(chalk.red(err));
                }
                else {
                    deferred.resolve(data);               
                }
            });
        }
        else {
            deferred.resolve(data);
        }
    }
    catch (e) {
        deferred.reject(e);
    }

    return deferred.promise;
}

function tableOrColumnExists(context, tableName, columnName, noPrefix) {
    
    var deferred = q.defer();
    
    try
    {
        var request = new sql.Request(pool);

        if (!noPrefix) {
            tableName = "DBA_" + tableName;
        }

        request.input('tableName', sql.VarChar,tableName)
        request.query("select id from sysobjects where type = 'U' and name = @tableName", function(err, result) {            
            if (err) {   
                deferred.reject(err);
                log.error(chalk.red(err));
            }
            else {
                var ret = {tableExists: false, columnExists: false};
                if (result.recordsets.length > 0 && result.recordsets[0].length > 0) {
                    ret.tableExists = true;
                    ret.tableId = result.recordsets[0][0].id;

                    if (typeof(columnName) !== "undefined" && columnName) {
                        request = new sql.Request(pool);
                        
                        request.input('tableId', sql.VarChar, result.recordsets[0][0].id)
                        request.input('columnName', sql.VarChar, columnName)
                        request.query("select id from syscolumns where id=@tableId and name = @columnName", function(err, result) {            
                            if (err) {   
                                deferred.reject(err);
                                log.error(chalk.red(err));
                            }
                            else {
                                if (result.recordsets.length > 0 && result.recordsets[0].length > 0) {
                                    ret.columnExists = true;
                                }
                                context.data = ret;
                                deferred.resolve(context);
                            }
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
            }
         
        });
    }
    catch(e)
    {
        deferred.reject(e);
    }
    
    return deferred.promise;
}

function indexExists(context, tableName, columns, noPrefix) {
    
    var deferred = q.defer();
    
    try
    {
        var ret = {tableExists: false, indexExists: false, isUnique: false, indexName: "", indexAllowed: true};

        tableOrColumnExists(context, tableName, columns[0], noPrefix).then(function(texists) { // Should check all columns, really. For now, it doesn't matter..

            if (texists.data.tableExists && texists.data.columnExists) {
                ret.tableExists = true;
                
                if (!noPrefix) {
                    tableName = "DBA_" + tableName;
                }

                const request = new sql.Request(pool);

                request.input('tableName', sql.VarChar,tableName)
                request.query("select i.is_unique, i.index_id, c.name, i.name as index_name"
                        + "\n from sys.tables o"
                        + "\n join sys.indexes i"
                        + "\n     on o.object_id = i.object_id"
                        + "\n join sys.index_columns ic"
                        + "\n     on o.object_id = ic.object_id"
                        + "\n     and i.index_id = ic.index_id"
                        + "\n join sys.columns c"
                        + "\n     on c.column_id = ic.column_id"
                        + "\n     and c.object_id = o.object_id"
                        + "\n where o.name  = @tableName"
                        + "\n order by i.index_id", function(err, result) {            
                    if (err) {   
                        deferred.reject(err);
                        log.error(chalk.red(err));
                    }
                    else { 
                        context.data = dbEngineLib.buildIndexRet(ret, result.recordsets[0], columns);
                        deferred.resolve(context);
                    }
                });
            }
            else {
                ret.indexAllowed = false;
                context.data = ret;
                deferred.resolve(context);
            }
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
            tableName = "DBA_" + tableName;
        }

        log.info("Creating index on " + tableName + " (" + columns.join(",") + ")");

        var sSQL = "create " + (isUnique ? "unique " : "") + "index " + indexName + " on " + tableName + " (" + (columns.join(",")) + ")";

        const request = new sql.Request(pool);

        request.query(sSQL, function(err, result) {            
            if (err) {   
                deferred.reject(err);
                log.error("SQL Error creating index on " + tableName + " (" + columns.join(",") + "):");
                log.error(chalk.red(err));
            }
            else {
                deferred.resolve(context);
                log.info("Index created on " + tableName + " (" + columns.join(",") + ")");
            }
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
    
    var deferred = q.defer();

    try {
        // var fExec = function() {
        var request = new sql.Request(context.txn ? context.txn : pool);

        _.each(st.params, function(value, key){
            // We are not currently handling "OU" parameters for SQL Server
            if (!value.direction || value.direction != dbEngineLib.direction.OUT) {
                request.input(key, _mapType(value.type, value.length), value.value);
            }
        });

        if (typeof(st.statement) !== "undefined" && st.statement) {
            request.query(st.statement, function(err, result) {  
                if (err) {   
                    deferred.reject(err);
                    log.error(chalk.red(err));
                    log.info(chalk.blue(st.statement));
                    log.info(chalk.blue(JSON.stringify(st.params)));
                }
                else {       
                    // recordset needs to be the last result, not the first, for compatibility with Postgre                    
                    var retData = { 
                        recordset: result.recordsets.length > 0 ? result.recordsets[result.recordsets.length-1] : [], 
                        rowsAffected: result.rowsAffected 
                    };
                    if (_.isArray(context.data)) {
                        context.data.push(retData);
                    }
                    else {
                        context.data = retData;
                    }
                    deferred.resolve(context);
                }
            });
        }
        else {
            deferred.reject("Empty SQL Statement");
        }
    }
    catch(e)
    {
        deferred.reject(e);
    }

    return deferred.promise;
}

function batchTxnExec(context, sts) {
    
    var deferred = q.defer();

    try {

        context.txn = new sql.Transaction(pool);
        context.txn.begin(function(err){
            if (err) {   
                deferred.reject(err);
                log.error(chalk.red(err));
            }
            else {
                try {

                    // This simple model for running multiple statements and resolving a promise
                    // when they are all finished doesn't work because they are run concurrently
                    // and lock each other out. Using _.reduce instead to build a chain of promises

                    // var execs = [];
                    // _.each(sts, function(st, iX){
                    //     execs.push(simpleExec(context, st));
                    // });                    
                    // q.all(execs)
                    context.data = [];

                    ((sts.length == 1) 
                        ? simpleExec(context, sts[0])
                        : _.reduce(sts, function(cur, next, iX){
                            if (iX <= 1) {
                                return simpleExec(context, cur).then(function(){
                                    return simpleExec(context, next);
                                });
                            }
                            else {
                                return cur.then(function(){
                                    return simpleExec(context, next);
                                });
                            }
                        })
                    )
                        .then(function(allData){
                            context.txn.commit(function(err){
                                if (err) {
                                    deferred.reject(err);
                                    log.error(chalk.red(err));
                                }
                                else {
                                    deferred.resolve(allData);                                    
                                }
                            });
                        })
                        .catch(function(err){  
                            context.txn.rollback();              
                            deferred.reject(err);
                            log.error(chalk.red(err));            
                        });
                }
                catch(e)
                {
                    context.txn.rollback(); 
                    deferred.reject(e);
                }
            }            
        });

    }
    catch(e)
    {
        deferred.reject(e);
    }

    return deferred.promise;
}

function resolveSQL(sqlDef) {
    return dbEngineLib.resolveSQL(sqlDef, "sqlserver", "DBA").then(function(st) {
        // Our statments use the ANSI standard TRUE and FALSE constants for booleans. Sql Server insists on 0 and 1
        var rxF = /\bFALSE\b/ig,
            rxT = /\bTRUE\b/ig; 
        
        if (_.isArray(st)) {
            st = _.map(st, function(def, ix){ return {statement: def.statement.replace(rxF, "0").replace(rxT, "1"), params: def.params }; });
        }
        else {
            st.statement = st.statement.replace(rxF, "0").replace(rxT, "1");             
        }
        return st;
    });
}

function _mapType(type, length) {
    var retType = sql.VarChar;

    switch(type) {
        case sqlTypes.Bit: retType = sql.Bit; break;
        case sqlTypes.BigInt: retType = sql.BigInt; break;
        case sqlTypes.Int: retType = sql.Int; break;
        case sqlTypes.TinyInt: retType = sql.TinyInt; break;
        case sqlTypes.Numeric: retType = sql.Numeric; break;
        case sqlTypes.Money: retType = sql.Money; break;
        //case sqlTypes.VarBinary: retType = sql.VarBinary; break;
        //case sqlTypes.LongVarBinary: retType = sql.LongVarBinary; break;
        //case sqlTypes.WVarChar: retType = sql.WVarChar; break;
        case sqlTypes.Double: retType = sql.Double; break;
        case sqlTypes.SmallInt: retType = sql.SmallInt; break;
        case sqlTypes.Float: retType = sql.Float; break;
        //case sqlTypes.Real: retType = sql.Real; break;
        case sqlTypes.Char: retType = sql.Char; break;
        //case sqlTypes.VarChar: retType = sql.VarChar; break;
        //case sqlTypes.WLongVarChar: retType = sql.WLongVarChar; break;
        // case sqlTypes.Time2: retType = sql.Time2; break;
        // case sqlTypes.Time: retType = sql.Time; break;
        // case sqlTypes.MyDate: retType = sql.MyDate; break;
        case sqlTypes.DateTime: retType = sql.DateTime; break;
        // case sqlTypes.DateTime2: retType = sql.DateTime2; break;
        // case sqlTypes.DateRound: retType = sql.DateRound; break;
        // case sqlTypes.DateTimeOffset: retType = sql.DateTimeOffset; break;
        // case sqlTypes.TvpFromTable: retType = sql.TvpFromTable; break;
        // case sqlTypes.Table: retType = sql.Table; break;
        // case sqlTypes.SmallMoney: retType = sql.SmallMoney; break;
        //case sqlTypes.UniqueIdentifier: retType = sql.UniqueIdentifier; break;
        //case sqlTypes.Image: retType = sql.Image; break;
        case sqlTypes.Decimal: retType = sql.Decimal; break;
        //case sqlTypes.NChar: retType = sql.NChar; break;
        //case sqlTypes.NVarChar: retType = sql.NVarChar; break;
        case sqlTypes.Text: retType = sql.Text; break;
        //case sqlTypes.NText: retType = sql.NText; break;
        // case sqlTypes.Xml: retType = sql.Xml; break;
        // case sqlTypes.SmallDateTime: retType = sql.SmallDateTime; break;
    }

    if (length) {
        retType = retType(length);
    }

    return retType;
}

module.exports = new IDbEngine.DbEngine(
    { engine: "sqlserver", table_prefix: "DBA_" },
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