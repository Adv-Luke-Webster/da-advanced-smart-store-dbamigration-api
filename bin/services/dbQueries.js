const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const sql = require("mssql");
const { Sequelize } = require("sequelize");

async function sqlQuery(connectionString, query) {
  try {
    const sequelize = new Sequelize(`${connectionString}`);
    const [result, metaData] = await sequelize.query(query);
    return result;
  } catch (err) {
    console.log(err);
    return result;
  }
}

function constructRetrievedResponse(result) {
  if (result.length > 0) {
    return ok(result);
  } else {
    result = result?.message;
    return badRequest(result);
  }
}

exports.getTables = async (req, res) => {
  if (req.query.connectionString) {
    let connectionString = req.query.connectionString;
    let databaseType = req.query.databaseType.databaseType;
    let query;
    if (databaseType === "mssql") {
      query = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME NOT LIKE 'DBA/_/_%' ESCAPE '/'
        AND TABLE_NAME LIKE 'DBA/_%' ESCAPE '/'`;
    } else if (databaseType === "oracle") {
      query = `SELECT table_name FROM user_tables WHERE TABLESPACE_NAME = 'USERS' 
    AND TABLE_NAME NOT LIKE 'QQQ/_/_%' ESCAPE '/'
    AND TABLE_NAME LIKE 'QQQ/_%' ESCAPE '/'`;
    }
    result = await sqlQuery(connectionString, query);
    res.send(constructRetrievedResponse(result));
  }
};
