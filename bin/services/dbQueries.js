const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const sql = require("mssql");

async function sqlQuery(connectionString, query) {
  try {
    // make sure that any items are correctly URL encoded in the connection string
    await sql.connect(connectionString);
    const result = await sql.query(query);
    return result;
  } catch (err) {
    console.log(err);
    return result;
  }
}

function constructRetrievedResponse(result) {
  if (result.recordset) {
    return ok(result.recordset);
  } else {
    result = result.message;
    return badRequest(result);
  }
}

exports.getTables = async (req, res) => {
  if (req.query.connectionString) {
    let connectionString = req.query.connectionString;
    let query = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME NOT LIKE 'DBA/_/_%' ESCAPE '/'
        AND TABLE_NAME LIKE 'DBA/_%' ESCAPE '/'`;
    result = await sqlQuery(connectionString, query);
    res.send(constructRetrievedResponse(result));
  }
};
