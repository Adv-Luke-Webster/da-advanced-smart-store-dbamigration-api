const sql = require('mssql')

async function sqlConnect (connectionString) {
    try {
      const result = await sql.connect(connectionString)
      return result
    } catch (err) {
      console.log(err)
      return err
    }
  }

exports.dbConnect = async (req, res) => {
        let connectionString = req.query.connectionString

        result = await sqlConnect(connectionString);
        if(result._connected){
          res.send(result._connected);
        } else {
          res.send(result.message)
        }
}

exports.dbDisConnect = async (req, res) => { 
const result = await sql.close()
    res.send(result)
}