

// A Javascript Class which we are using as an interface for the 
// various database backends that we support.
// This class here to encourage uniformity between the engines (though it can't enforce that)
// The required behaviour of the methods for each implementation is also documented here.

module.exports.DbEngine = function(
        oEngineDetails,
        fIsInitialised,
        fInit, 
        fInitConnection, 
        //fPrepare,
        //fExecuteFetchList,
        fCleanup,
        fTableOrColumnExists,
        fIndexExists,
        fCreateIndex,
        fSimpleExec,
        fBatchTxnExec,
        fResolveSQL        
    ) {
        
    // Object property containing details of the engine type, 
    // e.g. {engine: "sqlserver", table_prefix: "DBA_"}
    // or {engine: "postgresql", table_prefix: "qqq_"}
    this.engineDetails = oEngineDetails;
    
    // isInitialised returns a boolean to indicate whether the init method needs to be called.
    // Parameters:
    // Return:
    //      boolean
    // Generally it will parse the jdbcURL for connectivity information, but it will not open a connection.
    this.isInitialised = fIsInitialised;
    
    // init is called once when the module is first loaded. 
    // Parameters:
    //      instance    // Database instance, from config.local.jdbc (containing connnectivity and other configuration)
    // Return Promise:
    //      Resolve(db) // the database driver (an instance of IDBEngine)
    //      Reject(err) // Note that for all rejects, err must always have a message property containing 
    //                  // the error message string (other things are as per db engine)
    // Generally it will parse the jdbcURL for connectivity information, but it will not open a connection.
    this.init = fInit;

    // initConnection is the first thing called when access to the database is required.
    // Generally this will open a database connection.
    // Parameters:
    //  
    // Return Promise:
    //      Resolve({conn}) // conn = the connection handle
    //      Reject(err)       
    this.initConnection = fInitConnection;

    // prepare is passed the sql statement to be prepared before it is executed. 
    // Not all engines will prepare before they execute. If no prepare is required then
    // the sql statement can be passed instead of the statement handle in a resolved promise.
    // Parameters:
    //      context { conn }        The context object returned by initConnection
    //      sqlStatement         The SQL string.
    //      params {name: {type}, ...}     The parameters to bind to the statment.
    //                      Note that type is the SQL Server type - other database engines must convert to
    //                      their own native type, if required.
    //                      The bound parameter place holders in the SQL string must use the @param syntax, as per SQL Server.
    //                      The parameter names in this (and similar) object arrays do not include the "@" sign.
    //                      The params structure for a statement is generally obtained from the sqlStatements library.
    // Return Promise:
    //      Resolve({conn, stmt}) 
    //          conn = the connection handle
    //          stmt = the prepared statement handle, or the sql string if none
    //      Reject(err) 
    //this.prepare = fPrepare;

    // sqlExecuteFetchList will execute a prepared statement and resolve with an array of objects representing the data rows.
    // Parameters:
    //      context { conn , stmt }       The context object returned by prepare
    //      params {name: {[type, ] value}, ...}       The parameter values to bind to the statment.
    //              
    // Return Promise:
    //      Resolve({conn, stmt, data}) 
    //          conn = the connection handle
    //          stmt = the prepared statement handle, or the sql string if none
    //          data = the data to be returned after cleanup. The structure of the returned data is similar to sql server, e.g.:
    //                      recordset             array of rows from the last recordset produced by the query. 
    //                      rowsAffected          the number of rows affected by the last statement 
    //      Reject(err) 
    //this.executeFetchList = fExecuteFetchList;
    
    // cleanup will clean up any connections, perform commit or rollback on transactions, etc, based on the context object passed.
    // Parameters:
    //      context { conn, stmt, data }   Not all of these will be present if an error occurred.  
    //      success     Boolean - true = completed successfully, false - an error occurred
    // Return:
    //      Resolve(data) 
    //      Reject(err) 
    this.cleanup = fCleanup;
    
    
    // tableOrColumnExists will return a promise with a boolean indicating whether the given table name (without prefix)
    // or column name in that table, if given, currently exists in the database.
    // Parameters:
    //      context { conn }        The context object returned by initConnection
    //      tableName   The name of the table to check
    //      columnName  Optional - The name of the column in that table to check
    //      noPrefix    Optional - Do not add the table prefix (e.g. "DBA_")
    // Return:
    //      Resolve({tableExists, columnExists})
    //          tableExists = boolean stating whether the table exists or not 
    //          columnExists = boolean stating whether the column exists or not 
    //      Reject(err) 
    this.tableOrColumnExists = fTableOrColumnExists;    
    
    // indexExists will return a promise with an object containing boolean indicating  
    // whether the given index exists on a table, and if it does not whether it can
    // be created on that table. This is checked using the table name and columns,
    // not the index name. 
    // Parameters:
    //      context { conn }        The context object returned by initConnection
    //      tableName   The name of the table to check
    //      columns     Array of columns in that table to check
    //      noPrefix    Optional - Do not add the table prefix (e.g. "DBA_")
    // Return:
    //      Resolve({tableExists, indexExists, indexAllowed, isUnique, indexName})
    //          tableExists = boolean stating whether the table exists or not 
    //          indexExists = boolean stating whether an index exists on the given columns or not 
    //          indexAllowed = boolean stating whether an index can be create on these columns (false if the columns don't exist);
    //          isUnique = if the index exists, this boolean indicates whether the index is unique;
    //          indexName = if the index exists, the index name.
    //      Reject(err) 
    this.indexExists = fIndexExists;
    
    // createIndex will return a promise which is resolved when an index
    // has been created on the given table and columns with the given name.
    // Parameters:
    //      context { conn }        The context object returned by initConnection
    //      tableName   The name of the table on which to create the index
    //      columns     Array of columns in that table on which to create the index
    //      indexName   The name of the index to create
    //      isUnique    Whether to create a unique index
    //      noPrefix    Optional - Do not add the table prefix (e.g. "DBA_")
    // Return:
    //      Resolve({})
    //      Reject(err) 
    this.createIndex = fCreateIndex;

    // simpleExec will run a statement with no prepare stage. Most db access is likely to use this.
    // Parameters:
    //      context { conn }    The context object returned by initConnection
    //      st {statement, params {name: {type, value}, ...} }        The statement and parameters to execute. 
    //           (see prepare, above, for parameter structure).
    //              
    // Return Promise:
    //      Resolve({conn, data}) 
    //          conn = the connection handle
    //          data = the data to be returned after cleanup, see sqlExecuteFetchList above.
    //      Reject(err) 
    this.simpleExec = fSimpleExec;
    
    // batchTxnExec will run a batch of statements inside a transaction. 
    // Parameters:
    //      context { conn }    The context object returned by initConnection
    //      sts [{ statement, params {name: {type, value}, ...} }]     An array of statements to execute, with parameters for each statement.
    // Return Promise:
    //      Resolve({conn, data}) 
    //          conn = the connection handle
    //          data = the data to be returned after cleanup, see sqlExecuteFetchList above.
    //      Reject(err) 
    this.batchTxnExec = fBatchTxnExec;

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
    this.resolveSQL = fResolveSQL;
}