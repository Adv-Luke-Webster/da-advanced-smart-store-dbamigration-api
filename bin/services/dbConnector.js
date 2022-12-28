const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const sql = require("mssql");

async function sqlConnect(connectionString) {
  try {
    const result = await sql.connect(connectionString);
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
  result = await sqlConnect(connectionString);
  res.send(constructRetrievedResponse(result));
};

exports.dbDisConnect = async (req, res) => {
  const result = await sql.close();
  res.send(constructRetrievedResponse(result));
};
