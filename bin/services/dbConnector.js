const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const sql = require("mssql");
const oracle = require("oracledb");
const { Sequelize } = require("sequelize");

async function sqlConnect(connectionString, databaseType) {
  try {
    const sequelize = new Sequelize(`${connectionString}`);
    const result = await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    return result;
  } catch (err) {
    console.log(err);
    return err;
  }
}

function constructRetrievedResponse(result) {
  if (result._connected) {
    result = result._connected;
    return ok({
      data: result,
    });
  } else if (result._connected === false) {
    result = result._connected;
    return ok({
      data: result,
    });
  } else {
    result = result.message;
    return badRequest(result);
  }
}

exports.dbConnect = async (req, res) => {
  let connectionString = req.query.connectionString;
  let databaseType = req.query.databaseType;
  result = await sqlConnect(connectionString, databaseType);
  res.send(constructRetrievedResponse(result));
};

exports.dbDisConnect = async (req, res) => {
  const result = await sql.close();
  res.send(constructRetrievedResponse(result));
};
