/*
Library of SQL statements that can be run on the archive database

Each statment has a module and name by which it is accessed.
if engine specific names, e.g. "sqlserver" (based on the second element in the jdbc connection string) have statements defined these will be used,
else the generic "sql" statement will be used.
Each statement is an object { statement, params } where statement is the SQL string
and params are a collection of parameters for that statement. A statement can also be an array of these objects,
in which case each statement in the array will be executed inside a database transaction.
In generic statements, the escape string "<root>" will have the standard engine specific prefix substituted, e.g. "DBA_" for SQL Server and "QQQ_" for Oracle
Note that all select statement columns have to use an explicit alias in double quotes using "AS" in order to ensure the field names appear
in the correct case (Postgre forces them to lower case, Oracle defaults to upper case).
Note also that Oracle does not allow the "as" keyword in the from and join clauses, only in the select clause
For boolean constants use TRUE or FALSE. In SQL Server and Oracle these will be substituted for 1 and 0
*/

const _ = require('underscore')

// Need this to get the SQL Server data types, which we are using for all database engines.
// const sql = require("mssql/msnodesqlv8");
const sql = require('../modules/dbengines/SqlDataTypes.js').sqlTypes

const dbEngineLib = require('../modules/dbengines/dbEngineLib')

// The _.clone utility doesn't work well for cloning this structure. This works - wrap it up in a function.
function cloneStatement (stIn) {
  const stOut = { statement: stIn.statement, params: {} }
  _.each(stIn.params, function (value, key) { stOut.params[key] = { value: value.value, type: value.type } })
  return stOut
}

module.exports = {
  cloneStatement,
  archive: {
    deleteTable: {
      sql: {
        statement: 'delete from <root><table> where DBA_ROWID = @ROW_ID',
        params: {
          ROW_ID: { type: sql.Int }
        }
      }
    },
    deleteFTS: {
      sql: {
        statement: 'delete from <root>_BLOBS where BLOBHandle = (select FTS from <root><table> where DBA_ROWID = @ROW_ID)',
        params: {
          ROW_ID: { type: sql.Int }
        }
      }
    },
    deleteBlob: {
      sql: {
        statement: 'delete from <root>_BLOBS where BLOBHandle = @BLOB_ID',
        params: {
          BLOB_ID: { type: sql.Int }
        }
      }
    },
    deleteDeletionCandidate: {
      sql: {
        statement: 'delete from <root>_DELETION_CANDIDATES where DELC_BLOB = @BLOB_ID',
        params: {
          BLOB_ID: { type: sql.Int }
        }
      }
    },
    deleteAnnotations: {
      sql: {
        statement: 'delete from <root>_ANNOTATIONS where BLOB = @BLOB_ID',
        params: {
          BLOB_ID: { type: sql.Int }
        }
      }
    },
    getTableEntry: {
      sql: {
        statement: "select '<table>' as \"TABLE_NAME\"," +
                    '\n T_<table>.DBA_ROWID as "DBA_ROWID",' +
                    '\n B.BLOBType as "BLOBType",' +
                    '\n B.RETENTION_RULE_CODE as "RETENTION_RULE_CODE",' +
                    '\n B.BLOBHandle as "BLOBHandle",' +
                    '\n case when (B.BLOBType < 0 OR B.BLOBType > 10000) then B.dbfile else null end as "dbfile",' +
                    '\n <othercols> ,' +
                    '\n R.RRULE_NAME as "RRULE_NAME"' +
                    '\n from <root><table> T_<table>' +
                    '\n left outer join <root>_BLOBS B' +
                    '\n   on B.BLOBHandle = T_<table>.BLOB' +
                    '\n left outer join <root>_RETENTION_RULE R' +
                    '\n   on B.RETENTION_RULE_CODE = R.RRULE_CODE' +
                    '\n where BLOB = @BLOB_ID',
        params: {
          BLOB_ID: { type: sql.Int }
          // TABLE_NAME: { type: sql.VarChar }
        }
      }
    },
    registerArchiveUpdate: {
      sql: {
        statement: 'insert into V1_ArchiveUpdate (EventType, DbA_TableName, DbA_RowID)' +
                    '\n VALUES (@EVENT_TYPE, @TABLE_NAME, @ROW_ID)',
        params: {
          EVENT_TYPE: { type: sql.Int },
          TABLE_NAME: { type: sql.VarChar },
          ROW_ID: { type: sql.Int }
        }
      },
      oracle: {
        statement: 'insert into V1_ArchiveUpdate (EventID, EventType, DbA_TableName, DbA_RowID)' +
                    '\n VALUES (V1_AU_Sequence.nextval, @EVENT_TYPE, @TABLE_NAME, @ROW_ID)',
        params: {
          EVENT_TYPE: { type: sql.Int },
          TABLE_NAME: { type: sql.VarChar },
          ROW_ID: { type: sql.Int }
        }
      }
    }
  },
  utility: {
    getTables: {
      sqlserver: {
        statement: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' 
                AND TABLE_NAME NOT LIKE 'DBA/_/_%' ESCAPE '/'
                AND TABLE_NAME LIKE 'DBA/_%' ESCAPE '/'`
      },
      sql: {
        // statement: "select ArchiveTableName as \"name\","
        //     + "\n     TableDisplayName as \"displayName\","
        //     + "\n     count(*) as columnCount"
        //     + "\n from ARCHIVE_STRUCTURE"
        //     + "\n group by ArchiveTableName, TableDisplayName"
        //     + "\n order by ArchiveTableName",
        statement: 'select A.ArchiveTableName as "name",' +
                    '\n     A.TableDisplayName as "displayName",' +
                    '\n     count(*) as columnCount' +
                    '\n from ARCHIVE_STRUCTURE A' +
                    '\n join ARCHIVE_STRUCTURE B' +
                    '\n     on A.ARCHIVETABLENAME = B.ARCHIVETABLENAME' +
                    "\n     and B.FIELDNAME = 'BLOB'" +
                    '\n group by A.ArchiveTableName, A.TableDisplayName' +
                    '\n order by A.ArchiveTableName',
        params: {}
      }
    },
    getTableColumns: {
      sql: {
        statement: 'select A.ArchiveTableName as "tableName",' +
                    '\n     A.FieldName as "name",' +
                    '\n     A.FieldDisplayName as "displayName",' +
                    '\n     A.FieldType as "type",' +
                    '\n     A.FieldLength as "maxLen"' +
                    '\n from ARCHIVE_STRUCTURE A' +
                    '\n join ARCHIVE_STRUCTURE B' +
                    '\n     on A.ARCHIVETABLENAME = B.ARCHIVETABLENAME' +
                    "\n     and B.FIELDNAME = 'BLOB'" +
                    '\n order by A.ArchiveTableName',
        params: {}
      }

    }
  },
  retention: {
    selectRules: {
      // sql: "select FieldDisplayName, FieldName from ARCHIVE_STRUCTURE where ArchiveTableName = 'FirstTry'"
      sql: {
        statement: 'select RRULE_ID AS "RRULE_ID",' +
                    '\n RRULE_CODE AS "RRULE_CODE",' +
                    '\n RRULE_NAME AS "RRULE_NAME",' +
                    '\n RRULE_REASON AS "RRULE_REASON",' +
                    '\n RRULE_ALLOW_DELETE AS "RRULE_ALLOW_DELETE",' +
                    '\n RRULE_AUTO_DELETE AS "RRULE_AUTO_DELETE",' +
                    '\n RRULE_AUTO_DELETE_ON AS "RRULE_AUTO_DELETE_ON",' +
                    '\n RRULE_AUTO_DELETE_ON_DESC AS "RRULE_AUTO_DELETE_ON_DESC",' +
                    '\n RRULE_AUTO_DELETE_SPF_DATE AS "RRULE_AUTO_DELETE_SPF_DATE",' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE AS "RRULE_AUTO_DELETE_TAG_TABLE",' +
                    '\n RRULE_AUTO_DELETE_TAG_FIELD AS "RRULE_AUTO_DELETE_TAG_FIELD",' +
                    '\n RRULE_AUTO_DELETE_PERIOD AS "RRULE_AUTO_DELETE_PERIOD",' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE AS "RRULE_AUTO_DELETE_PERIOD_TYPE",' +
                    '\n RRULE_AUTO_DELETE_EMAIL AS "RRULE_AUTO_DELETE_EMAIL",' +
                    '\n RRULE_AUTO_DELETE_EMAIL_ADDR AS "RRULE_AUTO_DELETE_EMAIL_ADDR",' +
                    '\n RRULE_AUTO_DELETE_EMAIL_BEFORE AS "RRULE_AUTO_DELETE_EMAIL_BEFORE"' +
                    '\n FROM <root>_RETENTION_RULE' +
                    '\n ORDER BY RRULE_NAME'
      }
    },
    createRetentionRulesTable: {
      sqlserver: {
        statement: 'CREATE TABLE DBA__RETENTION_RULE (' +
                    '\n RRULE_ID int IDENTITY(1,1) not null,' +
                    '\n RRULE_CODE varchar(127) not null,' +
                    '\n RRULE_NAME varchar(1023) not null,' +
                    '\n RRULE_REASON varchar(max) null,' +
                    '\n RRULE_ALLOW_DELETE tinyint not null,' +
                    '\n RRULE_AUTO_DELETE bit not null,' +
                    '\n RRULE_AUTO_DELETE_ON tinyint not null,' +
                    '\n RRULE_AUTO_DELETE_ON_DESC varchar(1023) null,' +
                    '\n RRULE_AUTO_DELETE_SPF_DATE datetime null,' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_TAG_FIELD varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_PERIOD int null,' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE varchar(1) null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL bit not null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL_ADDR varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL_BEFORE int null,' +
                    '\n PRIMARY KEY CLUSTERED (RRULE_ID));' +
                    '\n CREATE UNIQUE INDEX AK_RRULE_CODE on DBA__RETENTION_RULE(RRULE_CODE)'
      },
      postgresql: {
        statement: 'CREATE TABLE qqq__RETENTION_RULE(' +
                    '\n RRULE_ID serial PRIMARY KEY,' +
                    '\n RRULE_CODE varchar(127) not null,' +
                    '\n RRULE_NAME varchar(1023) not null,' +
                    '\n RRULE_REASON text null,' +
                    '\n RRULE_ALLOW_DELETE int not null,' +
                    '\n RRULE_AUTO_DELETE boolean not null,' +
                    '\n RRULE_AUTO_DELETE_ON int not null,' +
                    '\n RRULE_AUTO_DELETE_ON_DESC varchar(1023) null,' +
                    '\n RRULE_AUTO_DELETE_SPF_DATE date null,' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_TAG_FIELD varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_PERIOD int null,' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE varchar(1) null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL boolean not null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL_ADDR varchar(127) null,' +
                    '\n RRULE_AUTO_DELETE_EMAIL_BEFORE int null);' +
                    '\n CREATE UNIQUE INDEX AK_RRULE_CODE on qqq__RETENTION_RULE(RRULE_CODE)'
      },
      oracle: [
        {
          statement: 'CREATE TABLE QQQ__RETENTION_RULE(' +
                        '\n RRULE_ID integer PRIMARY KEY,' +
                        '\n RRULE_CODE varchar(127) not null,' +
                        '\n RRULE_NAME varchar(1023) not null,' +
                        '\n RRULE_REASON CLOB null,' +
                        '\n RRULE_ALLOW_DELETE integer not null,' +
                        '\n RRULE_AUTO_DELETE number(1,0) not null,' +
                        '\n RRULE_AUTO_DELETE_ON int not null,' +
                        '\n RRULE_AUTO_DELETE_ON_DESC varchar(1023) null,' +
                        '\n RRULE_AUTO_DELETE_SPF_DATE date null,' +
                        '\n RRULE_AUTO_DELETE_TAG_TABLE varchar(127) null,' +
                        '\n RRULE_AUTO_DELETE_TAG_FIELD varchar(127) null,' +
                        '\n RRULE_AUTO_DELETE_PERIOD integer null,' +
                        '\n RRULE_AUTO_DELETE_PERIOD_TYPE varchar(1) null,' +
                        '\n RRULE_AUTO_DELETE_EMAIL number(1,0) not null,' +
                        '\n RRULE_AUTO_DELETE_EMAIL_ADDR varchar(127) null,' +
                        '\n RRULE_AUTO_DELETE_EMAIL_BEFORE integer null)'
        },
        {
          statement: 'CREATE SEQUENCE RETENTION_RRULE_ID MAXVALUE 2147483647'
        },
        {
          statement: 'CREATE UNIQUE INDEX AK_RRULE_CODE on QQQ__RETENTION_RULE(RRULE_CODE)'
        }
      ]
    },
    insertRule: {
      sqlserver: {
        statement: 'insert into <root>_RETENTION_RULE (RRULE_CODE, RRULE_NAME, RRULE_REASON, RRULE_ALLOW_DELETE,' +
                    '\n RRULE_AUTO_DELETE, RRULE_AUTO_DELETE_ON, RRULE_AUTO_DELETE_ON_DESC, RRULE_AUTO_DELETE_SPF_DATE,' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE, RRULE_AUTO_DELETE_TAG_FIELD, RRULE_AUTO_DELETE_PERIOD,' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE, RRULE_AUTO_DELETE_EMAIL,  RRULE_AUTO_DELETE_EMAIL_ADDR, RRULE_AUTO_DELETE_EMAIL_BEFORE)' +
                    '\n values (@RRULE_CODE, @RRULE_NAME, @RRULE_REASON, @RRULE_ALLOW_DELETE,' +
                    '\n @RRULE_AUTO_DELETE, @RRULE_AUTO_DELETE_ON, @RRULE_AUTO_DELETE_ON_DESC, @RRULE_AUTO_DELETE_SPF_DATE,' +
                    '\n @RRULE_AUTO_DELETE_TAG_TABLE, @RRULE_AUTO_DELETE_TAG_FIELD, @RRULE_AUTO_DELETE_PERIOD,' +
                    '\n @RRULE_AUTO_DELETE_PERIOD_TYPE, @RRULE_AUTO_DELETE_EMAIL,  @RRULE_AUTO_DELETE_EMAIL_ADDR, @RRULE_AUTO_DELETE_EMAIL_BEFORE);' +
                    '\n SELECT SCOPE_IDENTITY() AS RRULE_ID',
        params: {
          RRULE_CODE: { type: sql.VarChar },
          RRULE_NAME: { type: sql.VarChar },
          RRULE_REASON: { type: sql.VarChar },
          RRULE_ALLOW_DELETE: { type: sql.Int },
          RRULE_AUTO_DELETE: { type: sql.Bit },
          RRULE_AUTO_DELETE_ON: { type: sql.Int },
          RRULE_AUTO_DELETE_ON_DESC: { type: sql.VarChar },
          RRULE_AUTO_DELETE_SPF_DATE: { type: sql.DateTime },
          RRULE_AUTO_DELETE_TAG_TABLE: { type: sql.VarChar },
          RRULE_AUTO_DELETE_TAG_FIELD: { type: sql.VarChar },
          RRULE_AUTO_DELETE_PERIOD: { type: sql.Int },
          RRULE_AUTO_DELETE_PERIOD_TYPE: { type: sql.VarChar, length: 1 },
          RRULE_AUTO_DELETE_EMAIL: { type: sql.Bit },
          RRULE_AUTO_DELETE_EMAIL_ADDR: { type: sql.VarChar },
          RRULE_AUTO_DELETE_EMAIL_BEFORE: { type: sql.Int }
        }
      },
      postgresql: {
        statement: 'insert into <root>_RETENTION_RULE (RRULE_CODE, RRULE_NAME, RRULE_REASON, RRULE_ALLOW_DELETE,' +
                    '\n RRULE_AUTO_DELETE, RRULE_AUTO_DELETE_ON, RRULE_AUTO_DELETE_ON_DESC, RRULE_AUTO_DELETE_SPF_DATE,' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE, RRULE_AUTO_DELETE_TAG_FIELD, RRULE_AUTO_DELETE_PERIOD,' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE, RRULE_AUTO_DELETE_EMAIL,  RRULE_AUTO_DELETE_EMAIL_ADDR, RRULE_AUTO_DELETE_EMAIL_BEFORE)' +
                    '\n values (${RRULE_CODE}, ${RRULE_NAME}, ${RRULE_REASON}, ${RRULE_ALLOW_DELETE},' +
                    '\n ${RRULE_AUTO_DELETE}, ${RRULE_AUTO_DELETE_ON}, ${RRULE_AUTO_DELETE_ON_DESC}, ${RRULE_AUTO_DELETE_SPF_DATE},' +
                    '\n ${RRULE_AUTO_DELETE_TAG_TABLE}, ${RRULE_AUTO_DELETE_TAG_FIELD}, ${RRULE_AUTO_DELETE_PERIOD},' +
                    '\n ${RRULE_AUTO_DELETE_PERIOD_TYPE}, ${RRULE_AUTO_DELETE_EMAIL},  ${RRULE_AUTO_DELETE_EMAIL_ADDR}, ${RRULE_AUTO_DELETE_EMAIL_BEFORE})' +
                    '\n RETURNING RRULE_ID AS "RRULE_ID"',
        params: {
          RRULE_CODE: { type: sql.VarChar },
          RRULE_NAME: { type: sql.VarChar },
          RRULE_REASON: { type: sql.VarChar },
          RRULE_ALLOW_DELETE: { type: sql.Int },
          RRULE_AUTO_DELETE: { type: sql.Bit },
          RRULE_AUTO_DELETE_ON: { type: sql.Int },
          RRULE_AUTO_DELETE_ON_DESC: { type: sql.VarChar },
          RRULE_AUTO_DELETE_SPF_DATE: { type: sql.DateTime },
          RRULE_AUTO_DELETE_TAG_TABLE: { type: sql.VarChar },
          RRULE_AUTO_DELETE_TAG_FIELD: { type: sql.VarChar },
          RRULE_AUTO_DELETE_PERIOD: { type: sql.Int },
          RRULE_AUTO_DELETE_PERIOD_TYPE: { type: sql.VarChar, length: 1 },
          RRULE_AUTO_DELETE_EMAIL: { type: sql.Bit },
          RRULE_AUTO_DELETE_EMAIL_ADDR: { type: sql.VarChar },
          RRULE_AUTO_DELETE_EMAIL_BEFORE: { type: sql.Int }
        }
      },
      oracle: {
        statement: 'insert into <root>_RETENTION_RULE (RRULE_ID, RRULE_CODE, RRULE_NAME, RRULE_REASON, RRULE_ALLOW_DELETE,' +
                    '\n RRULE_AUTO_DELETE, RRULE_AUTO_DELETE_ON, RRULE_AUTO_DELETE_ON_DESC, RRULE_AUTO_DELETE_SPF_DATE,' +
                    '\n RRULE_AUTO_DELETE_TAG_TABLE, RRULE_AUTO_DELETE_TAG_FIELD, RRULE_AUTO_DELETE_PERIOD,' +
                    '\n RRULE_AUTO_DELETE_PERIOD_TYPE, RRULE_AUTO_DELETE_EMAIL,  RRULE_AUTO_DELETE_EMAIL_ADDR, RRULE_AUTO_DELETE_EMAIL_BEFORE)' +
                    '\n values (RETENTION_RRULE_ID.nextval, :RRULE_CODE, :RRULE_NAME, :RRULE_REASON, :RRULE_ALLOW_DELETE,' +
                    '\n :RRULE_AUTO_DELETE, :RRULE_AUTO_DELETE_ON, :RRULE_AUTO_DELETE_ON_DESC, :RRULE_AUTO_DELETE_SPF_DATE,' +
                    '\n :RRULE_AUTO_DELETE_TAG_TABLE, :RRULE_AUTO_DELETE_TAG_FIELD, :RRULE_AUTO_DELETE_PERIOD,' +
                    '\n :RRULE_AUTO_DELETE_PERIOD_TYPE, :RRULE_AUTO_DELETE_EMAIL,  :RRULE_AUTO_DELETE_EMAIL_ADDR, :RRULE_AUTO_DELETE_EMAIL_BEFORE)' +
                    '\n RETURNING RRULE_ID INTO :RRULE_ID',
        params: {
          RRULE_CODE: { type: sql.VarChar },
          RRULE_NAME: { type: sql.VarChar },
          RRULE_REASON: { type: sql.VarChar },
          RRULE_ALLOW_DELETE: { type: sql.Int },
          RRULE_AUTO_DELETE: { type: sql.Bit },
          RRULE_AUTO_DELETE_ON: { type: sql.Int },
          RRULE_AUTO_DELETE_ON_DESC: { type: sql.VarChar },
          RRULE_AUTO_DELETE_SPF_DATE: { type: sql.DateTime },
          RRULE_AUTO_DELETE_TAG_TABLE: { type: sql.VarChar },
          RRULE_AUTO_DELETE_TAG_FIELD: { type: sql.VarChar },
          RRULE_AUTO_DELETE_PERIOD: { type: sql.Int },
          RRULE_AUTO_DELETE_PERIOD_TYPE: { type: sql.VarChar, length: 1 },
          RRULE_AUTO_DELETE_EMAIL: { type: sql.Bit },
          RRULE_AUTO_DELETE_EMAIL_ADDR: { type: sql.VarChar },
          RRULE_AUTO_DELETE_EMAIL_BEFORE: { type: sql.Int },
          RRULE_ID: { type: sql.Int, direction: dbEngineLib.direction.OUT }
        }
      }
    },
    updateRule: {
      sql: {
        statement: 'update <root>_RETENTION_RULE SET' +
                '\n RRULE_NAME = @RRULE_NAME, ' +
                '\n RRULE_REASON = @RRULE_REASON, ' +
                '\n RRULE_ALLOW_DELETE = @RRULE_ALLOW_DELETE,' +
                '\n RRULE_AUTO_DELETE =  @RRULE_AUTO_DELETE, ' +
                '\n RRULE_AUTO_DELETE_ON = @RRULE_AUTO_DELETE_ON, ' +
                '\n RRULE_AUTO_DELETE_ON_DESC = @RRULE_AUTO_DELETE_ON_DESC, ' +
                '\n RRULE_AUTO_DELETE_SPF_DATE = @RRULE_AUTO_DELETE_SPF_DATE,' +
                '\n RRULE_AUTO_DELETE_TAG_TABLE = @RRULE_AUTO_DELETE_TAG_TABLE,' +
                '\n RRULE_AUTO_DELETE_TAG_FIELD = @RRULE_AUTO_DELETE_TAG_FIELD,' +
                '\n RRULE_AUTO_DELETE_PERIOD = @RRULE_AUTO_DELETE_PERIOD,' +
                '\n RRULE_AUTO_DELETE_PERIOD_TYPE = @RRULE_AUTO_DELETE_PERIOD_TYPE, ' +
                '\n RRULE_AUTO_DELETE_EMAIL = @RRULE_AUTO_DELETE_EMAIL,  ' +
                '\n RRULE_AUTO_DELETE_EMAIL_ADDR = @RRULE_AUTO_DELETE_EMAIL_ADDR, ' +
                '\n RRULE_AUTO_DELETE_EMAIL_BEFORE = @RRULE_AUTO_DELETE_EMAIL_BEFORE' +
                '\n WHERE RRULE_ID = @RRULE_ID',
        params: {
          RRULE_ID: { type: sql.Int },
          RRULE_NAME: { type: sql.VarChar },
          RRULE_REASON: { type: sql.VarChar },
          RRULE_ALLOW_DELETE: { type: sql.Int },
          RRULE_AUTO_DELETE: { type: sql.Bit },
          RRULE_AUTO_DELETE_ON: { type: sql.Int },
          RRULE_AUTO_DELETE_ON_DESC: { type: sql.VarChar },
          RRULE_AUTO_DELETE_SPF_DATE: { type: sql.DateTime },
          RRULE_AUTO_DELETE_TAG_TABLE: { type: sql.VarChar },
          RRULE_AUTO_DELETE_TAG_FIELD: { type: sql.VarChar },
          RRULE_AUTO_DELETE_PERIOD: { type: sql.Int },
          RRULE_AUTO_DELETE_PERIOD_TYPE: { type: sql.VarChar, length: 1 },
          RRULE_AUTO_DELETE_EMAIL: { type: sql.Bit },
          RRULE_AUTO_DELETE_EMAIL_ADDR: { type: sql.VarChar },
          RRULE_AUTO_DELETE_EMAIL_BEFORE: { type: sql.Int }
        }
      }
    },
    deleteRule: {
      sql: [
        {
          statement: 'delete from <root>_DELETION_CANDIDATES ' +
                    '\n where DELC_RRULE_CODE = (SELECT RRULE_CODE FROM <root>_RETENTION_RULE WHERE RRULE_ID = @RRULE_ID)',
          params: {
            RRULE_ID: { type: sql.Int }
          }
        },
        {
          statement: 'delete from <root>_RETENTION_DEFAULT_RULE' +
                        '\n WHERE RDR_RRULE_CODE = (SELECT RRULE_CODE FROM <root>_RETENTION_RULE WHERE RRULE_ID = @RRULE_ID)',
          params: {
            RRULE_ID: { type: sql.Int }
          }
        },
        {
          statement: 'delete from <root>_RETENTION_RULE' +
                        '\n WHERE RRULE_ID = @RRULE_ID',
          params: {
            RRULE_ID: { type: sql.Int }
          }
        }
      ]
    },
    selectTableDefaults: {
      sql: {
        statement: 'select RDR_TABLE_NAME as "RDR_TABLE_NAME",' +
                    '\n RRULE_ID AS "RRULE_ID",' +
                    '\n RRULE_CODE AS "RRULE_CODE",' +
                    '\n RRULE_NAME AS "RRULE_NAME"' +
                    '\n from <root>_RETENTION_DEFAULT_RULE' +
                    '\n join <root>_RETENTION_RULE' +
                    '\n     on RRULE_CODE = RDR_RRULE_CODE'
      }
    },
    updateTableDefault: {
      sql: {
        statement: 'update <root>_RETENTION_DEFAULT_RULE SET RDR_RRULE_CODE = @RDR_RRULE_CODE WHERE RDR_TABLE_NAME = @RDR_TABLE_NAME',
        params: {
          RDR_RRULE_CODE: { type: sql.VarChar },
          RDR_TABLE_NAME: { type: sql.VarChar }
        }
      }
    },
    insertTableDefault: {
      sql: {
        statement: 'insert into <root>_RETENTION_DEFAULT_RULE (RDR_RRULE_CODE, RDR_TABLE_NAME)' +
                    '\n values (@RDR_RRULE_CODE, @RDR_TABLE_NAME)',
        params: {
          RDR_RRULE_CODE: { type: sql.VarChar },
          RDR_TABLE_NAME: { type: sql.VarChar }
        }
      }
    },
    deleteTableDefault: {
      sql: {
        statement: 'delete from <root>_RETENTION_DEFAULT_RULE' +
                    '\n WHERE RDR_TABLE_NAME = @RDR_TABLE_NAME',
        params: {
          RDR_TABLE_NAME: { type: sql.VarChar }
        }
      }
    }
  },
  deleteCandidates: {
    createDeletionCandidatesTable: {
      sql: {
        statement: 'CREATE TABLE <root>_DELETION_CANDIDATES (' +
                    '\n DELC_BLOB int not null PRIMARY KEY,' +
                    '\n DELC_RRULE_CODE varchar(127) not null,' +
                    '\n DELC_TRIGGER_DATE datetime null,' +
                    '\n DELC_DELETION_DUE_DATE datetime null,' +
                    '\n DELC_SELECTED_DATE datetime null,' +
                    '\n DELC_SELECTION_DUE_DATE datetime null);' +
                    '\n CREATE INDEX IX_DELC_RRULE_CODE on <root>_DELETION_CANDIDATES(DELC_RRULE_CODE)'
      },
      postgresql: {
        statement: 'CREATE TABLE <root>_DELETION_CANDIDATES (' +
                    '\n DELC_BLOB int not null PRIMARY KEY,' +
                    '\n DELC_RRULE_CODE varchar(127) not null,' +
                    '\n DELC_TRIGGER_DATE date null,' +
                    '\n DELC_DELETION_DUE_DATE date null,' +
                    '\n DELC_SELECTED_DATE timestamp null,' +
                    '\n DELC_SELECTION_DUE_DATE date null);' +
                    '\n CREATE INDEX IX_DELC_RRULE_CODE on <root>_DELETION_CANDIDATES(DELC_RRULE_CODE)'
      },
      oracle: [
        {
          statement: 'CREATE TABLE <root>_DELETION_CANDIDATES (' +
                        '\n DELC_BLOB integer not null PRIMARY KEY,' +
                        '\n DELC_RRULE_CODE varchar(127) not null,' +
                        '\n DELC_TRIGGER_DATE date null,' +
                        '\n DELC_DELETION_DUE_DATE date null,' +
                        '\n DELC_SELECTED_DATE TIMESTAMP null,' +
                        '\n DELC_SELECTION_DUE_DATE date null)'
        },
        {
          statement: 'CREATE INDEX IX_DELC_RRULE_CODE on <root>_DELETION_CANDIDATES(DELC_RRULE_CODE)'
        }
      ]
    },
    getCandidatesByBlobDate: {
      sql: {
        statement: 'select TOP <top> B.BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <refdate> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <refdate> <= @TRIGGER_DATETIME',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_DATETIME: { type: sql.DateTime }
        }
      },
      postgresql: {
        statement: 'select B.BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <refdate> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <refdate> <= @TRIGGER_DATETIME' +
                    '\n limit <top>',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_DATETIME: { type: sql.DateTime }
        }
      },
      oracle: {
        statement: 'select BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <refdate> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <refdate> <= @TRIGGER_DATETIME' +
                    '\n and rownum <= <top>',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_DATETIME: { type: sql.DateTime }
        }
      }
    },
    getCandidatesByDocumentDate: {
      sql: {
        statement: 'select TOP <top> B.BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <datefield> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n join <root><table> TA' +
                    '\n     on TA.BLOB = B.BLOBHandle' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <datefield> <= @TRIGGER_UNIXDATE' +
                    '\n and <datefield> != 0',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_UNIXDATE: { type: sql.Int }
        }
      },
      postgresql: {
        statement: 'select B.BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <datefield> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n join <root><table> TA' +
                    '\n     on TA.BLOB = B.BLOBHandle' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <datefield> <= @TRIGGER_UNIXDATE' +
                    '\n and <datefield> != 0' +
                    '\n limit <top>',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_UNIXDATE: { type: sql.Int }
        }
      },
      oracle: {
        statement: 'select BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE", ' +
                    '\n <datefield> as "REF_DATE"' +
                    '\n from <root>_BLOBS B' +
                    '\n join <root><table> TA' +
                    '\n     on TA.BLOB = B.BLOBHandle' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = B.BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and <datefield> <= @TRIGGER_UNIXDATE' +
                    '\n and <datefield> != 0' +
                    '\n and rownum <= <top>',
        params: {
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_UNIXDATE: { type: sql.Int }
        }
      }
    },
    getCandidatesForFixedDate: {
      sql: {
        statement: 'select TOP <top> BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE"' +
                    '\n from <root>_BLOBS' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL',
        params: {
          RULE_CODE: { type: sql.VarChar }
        }
      },
      postgresql: {
        statement: 'select BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE"' +
                    '\n from <root>_BLOBS' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n limit <top>',
        params: {
          RULE_CODE: { type: sql.VarChar }
        }
      },
      oracle: {
        statement: 'select BLOBHandle as "BLOBHandle", ' +
                    '\n BLOBType as "BLOBType", ' +
                    '\n CREATION_DATE as "CREATION_DATE"' +
                    '\n from <root>_BLOBS' +
                    '\n left join <root>_DELETION_CANDIDATES C' +
                    '\n   on C.DELC_BLOB = BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and C.DELC_BLOB IS NULL' +
                    '\n and rownum <= <top>',
        params: {
          RULE_CODE: { type: sql.VarChar }
        }
      }
    },
    insertCandidates: {
      sql: {
        statement: 'insert into <root>_DELETION_CANDIDATES (' +
                    '\n DELC_BLOB,' +
                    '\n DELC_RRULE_CODE,' +
                    '\n DELC_TRIGGER_DATE,' +
                    '\n DELC_DELETION_DUE_DATE,' +
                    '\n DELC_SELECTED_DATE,' +
                    '\n DELC_SELECTION_DUE_DATE' +
                    '\n ) VALUES (' +
                    '\n @BLOB_ID,' +
                    '\n @RULE_CODE,' +
                    '\n @TRIGGER_DATE,' +
                    '\n @DELETION_DUE_DATE,' +
                    '\n @SELECTED_DATE,' +
                    '\n @SELECTION_DUE_DATE' +
                    '\n )',
        params: {
          BLOB_ID: { type: sql.Int },
          RULE_CODE: { type: sql.VarChar },
          TRIGGER_DATE: { type: sql.DateTime },
          DELETION_DUE_DATE: { type: sql.DateTime },
          SELECTED_DATE: { type: sql.DateTime },
          SELECTION_DUE_DATE: { type: sql.DateTime }
        }
      }
    },
    getCandidates: {
      sql: {
        statement: 'select TOP <top> DELC_BLOB as "BLOB_ID", ' +
                '\n DELC_DELETION_DUE_DATE as "DELC_DELETION_DUE_DATE", ' +
                '\n DELC_TRIGGER_DATE as "DELC_TRIGGER_DATE",' +
                '\n DELC_SELECTED_DATE as "DELC_SELECTED_DATE",' +
                '\n BLOBType as "BLOBType",' +
                '\n RETENTION_RULE_CODE as "RETENTION_RULE_CODE",' +
                '\n CREATION_DATE as "CREATION_DATE",' +
                '\n DO_NOT_DELETE as "DO_NOT_DELETE"' +
                '\n from <root>_DELETION_CANDIDATES' +
                '\n join <root>_BLOBS' +
                '\n     on DELC_BLOB = BLOBHandle' +
                '\n where (RETENTION_RULE_CODE = @RULE_CODE OR @RULE_CODE IS NULL)' +
                '\n and (@LAST_DUE_DATE IS NULL' +
                '\n     OR DELC_DELETION_DUE_DATE > @LAST_DUE_DATE' +
                '\n     OR (DELC_DELETION_DUE_DATE = @LAST_DUE_DATE AND DELC_BLOB > @LAST_BLOB_ID))' +
                '\n order by DELC_DELETION_DUE_DATE, DELC_BLOB',
        params: {
          RULE_CODE: { type: sql.VarChar },
          LAST_BLOB_ID: { type: sql.Int },
          LAST_DUE_DATE: { type: sql.DateTime }
        }
      },
      postgresql: {
        statement: 'select DELC_BLOB as "BLOB_ID", ' +
                '\n DELC_DELETION_DUE_DATE as "DELC_DELETION_DUE_DATE", ' +
                '\n DELC_TRIGGER_DATE as "DELC_TRIGGER_DATE",' +
                '\n DELC_SELECTED_DATE as "DELC_SELECTED_DATE",' +
                '\n BLOBType as "BLOBType",' +
                '\n RETENTION_RULE_CODE as "RETENTION_RULE_CODE",' +
                '\n CREATION_DATE as "CREATION_DATE",' +
                '\n DO_NOT_DELETE as "DO_NOT_DELETE"' +
                '\n from <root>_DELETION_CANDIDATES' +
                '\n join <root>_BLOBS' +
                '\n     on DELC_BLOB = BLOBHandle' +
                '\n where (RETENTION_RULE_CODE = @RULE_CODE OR @RULE_CODE IS NULL)' +
                '\n and (@LAST_DUE_DATE IS NULL' +
                '\n     OR DELC_DELETION_DUE_DATE > @LAST_DUE_DATE' +
                '\n     OR (DELC_DELETION_DUE_DATE = @LAST_DUE_DATE AND DELC_BLOB > @LAST_BLOB_ID))' +
                '\n order by DELC_DELETION_DUE_DATE, DELC_BLOB' +
                '\n limit <top>',
        params: {
          RULE_CODE: { type: sql.VarChar },
          LAST_BLOB_ID: { type: sql.Int },
          LAST_DUE_DATE: { type: sql.DateTime }
        }
      },
      oracle: {
        statement: 'select DELC_BLOB as "BLOB_ID", ' +
                '\n DELC_DELETION_DUE_DATE as "DELC_DELETION_DUE_DATE", ' +
                '\n DELC_TRIGGER_DATE as "DELC_TRIGGER_DATE",' +
                '\n DELC_SELECTED_DATE as "DELC_SELECTED_DATE",' +
                '\n BLOBType as "BLOBType",' +
                '\n RETENTION_RULE_CODE as "RETENTION_RULE_CODE",' +
                '\n CREATION_DATE as "CREATION_DATE",' +
                '\n DO_NOT_DELETE as "DO_NOT_DELETE"' +
                '\n from <root>_DELETION_CANDIDATES' +
                '\n join <root>_BLOBS' +
                '\n     on DELC_BLOB = BLOBHandle' +
                '\n where (RETENTION_RULE_CODE = @RULE_CODE OR @RULE_CODE IS NULL)' +
                '\n and (@LAST_DUE_DATE IS NULL' +
                '\n     OR DELC_DELETION_DUE_DATE > @LAST_DUE_DATE' +
                '\n     OR (DELC_DELETION_DUE_DATE = @LAST_DUE_DATE AND DELC_BLOB > @LAST_BLOB_ID))' +
                '\n and rownum <= <top>' +
                '\n order by DELC_DELETION_DUE_DATE, DELC_BLOB',
        params: {
          RULE_CODE: { type: sql.VarChar },
          LAST_BLOB_ID: { type: sql.Int },
          LAST_DUE_DATE: { type: sql.DateTime }
        }
      }
    },
    countCandidates: {
      sql: {
        statement: 'select count(*) as "TOTAL_CANDIDATES"' +
                '\n from <root>_DELETION_CANDIDATES' +
                '\n join <root>_BLOBS' +
                '\n     on DELC_BLOB = BLOBHandle' +
                '\n where RETENTION_RULE_CODE = @RULE_CODE',
        params: {
          RULE_CODE: { type: sql.VarChar }
        }
      }
    },
    setDoNotDelete: {
      sql: {
        statement: 'update <root>_BLOBS' +
                '\n SET DO_NOT_DELETE = @DO_NOT_DELETE' +
                '\n where BLOBHandle = @BLOB_ID',
        params: {
          BLOB_ID: { type: sql.Int },
          DO_NOT_DELETE: { type: sql.Bit }
        }
      }
    },
    setAllDoNotDelete: {
      postgresql: {
        statement: 'update <root>_BLOBS' +
                    '\n SET DO_NOT_DELETE = @DO_NOT_DELETE' +
                    '\n from <root>_BLOBS BL' +
                    '\n join <root>_DELETION_CANDIDATES' +
                    '\n    on DELC_BLOB = BL.BLOBHandle' +
                    '\n where BL.BLOBHandle = qqq__BLOBS.BLOBHandle' +
                    '\n and BL.RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and ((@DO_NOT_DELETE = TRUE AND BL.DO_NOT_DELETE IS NULL)' +
                    '\n     or (@DO_NOT_DELETE != BL.DO_NOT_DELETE))',
        params: {
          RULE_CODE: { type: sql.VarChar },
          DO_NOT_DELETE: { type: sql.Bit }
        }
      },
      sqlserver: {
        statement: 'update <root>_BLOBS' +
                    '\n SET DO_NOT_DELETE = @DO_NOT_DELETE' +
                    '\n from <root>_BLOBS' +
                    '\n join <root>_DELETION_CANDIDATES' +
                    '\n    on DELC_BLOB = BLOBHandle' +
                    '\n where RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and ((@DO_NOT_DELETE = TRUE AND DO_NOT_DELETE IS NULL)' +
                    '\n    or (@DO_NOT_DELETE != DO_NOT_DELETE))',
        params: {
          RULE_CODE: { type: sql.VarChar },
          DO_NOT_DELETE: { type: sql.Bit }
        }
      },
      oracle: {
        statement: 'update <root>_BLOBS' +
                    '\n SET DO_NOT_DELETE = @DO_NOT_DELETE' +
                    '\n where BLOBHandle in (select DELC_BLOB' +
                    '\n   FROM QQQ__DELETION_CANDIDATES)' +
                    '\n and RETENTION_RULE_CODE = @RULE_CODE' +
                    '\n and ((@DO_NOT_DELETE = TRUE AND DO_NOT_DELETE IS NULL)' +
                    '\n    or (@DO_NOT_DELETE != DO_NOT_DELETE))',
        params: {
          RULE_CODE: { type: sql.VarChar },
          DO_NOT_DELETE: { type: sql.Bit }
        }
      }
    },
    clearCandidates: {
      sql: {
        statement: 'delete from <root>_DELETION_CANDIDATES' +
                '\n where (DELC_RRULE_CODE = @RULE_CODE OR @RULE_CODE IS NULL)',
        params: {
          RULE_CODE: { type: sql.VarChar }
        }
      }
    }
  }
}
