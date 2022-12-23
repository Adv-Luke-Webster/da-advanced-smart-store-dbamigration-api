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
//TODO: Correct error handling to prevent API crash
exports.getTables = async (req, res) => {
  let connectionString = req.query.connectionString;
  let query = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME NOT LIKE 'DBA/_/_%' ESCAPE '/'
        AND TABLE_NAME LIKE 'DBA/_%' ESCAPE '/'`;
  result = await sqlQuery(connectionString, query);
  if (result.recordset) {
    result = result.recordset;
  } else {
    result = result.message;
  }
  res.send(result);

  // result = await sqlConnect(connectionString);
  // if(result._connected){
  //   res.send(result._connected);
  // } else {
  //   res.send(result.message)
  // }
};
