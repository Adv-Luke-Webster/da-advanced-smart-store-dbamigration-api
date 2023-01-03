const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const sql = require("mssql");
const oracle = require("oracledb");
const { Sequelize } = require("sequelize");

async function sqlConnect(connectionString, databaseType) {
  let result;
  try {
    const sequelize = new Sequelize(`${connectionString}`);
    await sequelize.authenticate().then(() => {
      result = true;
    });
  } catch (err) {
    console.log(err);
    return err;
  }
  return result;
}

async function sqlDisConnect(connectionString, databaseType) {
  let result;
  try {
    const sequelize = new Sequelize(`${connectionString}`);
    await sequelize.close().then(() => {
      result = false;
    });
  } catch (err) {
    console.log(err);
    return err;
  }
  return result;
}

function constructRetrievedResponse(result) {
  if (result === true) {
    return ok({
      data: result,
    });
  } else if (result === false) {
    return ok({
      data: result,
    });
  } else {
    result = result.message;
    return badRequest("Request is bad", result);
  }
}

exports.dbConnect = async (req, res) => {
  let connectionString = req.query.connectionString;
  let databaseType = req.query.databaseType.databaseType;
  result = await sqlConnect(connectionString, databaseType);
  if (result === true) {
    res.send(constructRetrievedResponse(result));
  } else {
    res.status(400).send(badRequest(result.message));
  }
};

exports.dbDisConnect = async (req, res) => {
  let connectionString = req.query.connectionString;
  let databaseType = req.query.databaseType;
  result = await sqlDisConnect(connectionString, databaseType);
  if (result === false) {
    res.send(constructRetrievedResponse(result));
  } else {
    res.status(400).send(badRequest(result.message));
  }
};
