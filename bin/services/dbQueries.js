const { badRequest, ok } = require('../HttpHandlers/responseBuilder')
const sql = require('mssql')
const _ = require('underscore')
const archiveSQL = require('../modules/getEngine.js')
const { result } = require('underscore')
const log = require('../helper/logger')
const chalk = require('chalk')

async function driverToUse (connectionString) {
  this._driver = await archiveSQL.getDb(connectionString)
  return this._driver
}

function getTables (driverToUse, connectionString, action) {
  return new Promise(async (resolve, reject) => {
    if (connectionString) {
      driverToUse.initConnection(connectionString, 'getTables').then(
        (success) => {
          resolve(success)
        },
        (err) => {
          reject(err)
        }
      )
    } else {
      // TODO: Add error no connection string
      return false
    }
  })
}

function constructRetrievedResponse (result) {
  if (result.length > 0) {
    return ok(result)
  } else {
    result = result?.message
    return badRequest(result)
  }
}

exports.getTables = async (req, res) => {
  if (req.query.connectionString) {
    const connectionString = req.query.connectionString
    const databaseType = req.query.databaseType
    let query
    driverToUse(connectionString, databaseType).then(async (result) => {
      if(_.isUndefined(result.engineDetails)){
        res.status(400).send(badRequest(JSON.stringify(result.message)))
        return
      }
      getTables(result, connectionString, 'open').then(
        (result) => {
          if (result) {
            res.send(constructRetrievedResponse(result.recordset))
          } else {
            res.status(400).send(badRequest('Error occured in connection'))
          }
        },
        (err) => {
          res.status(400).send(badRequest(err.message))
        }
      )
    })
  }
}
