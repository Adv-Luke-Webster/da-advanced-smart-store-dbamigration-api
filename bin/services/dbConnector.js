const { badRequest, ok } = require('../HttpHandlers/responseBuilder')
const _ = require('underscore')
const archiveSQL = require('../modules/archiveSQL.js')
const { result } = require('underscore')
const log = require('../helper/logger')
const chalk = require('chalk')

async function driverToUse (connectionString) {
  this._driver = await archiveSQL.getDb(connectionString)
  return this._driver
}

function sqlConnect (driverToUse, connectionString, action) {
  return new Promise(async (resolve, reject) => {
    if (connectionString) {
      driverToUse.init(connectionString, action).then((success) => {
        resolve(success)
      }, (err) => {
        reject(err)
      })
    } else {
      // TODO: Add error no connection string
      return false
    }
  })
}

function constructRetrievedResponse (result) {
  if (result === true) {
    return ok({
      data: result
    })
  } else if (result === false) {
    return ok({
      data: result
    })
  } else {
    result = result.message
    return badRequest('Request is bad', result)
  }
}

exports.dbConnect = (req, res) => {
  const connectionString = req.query.connectionString
  const databaseType = req.query.databaseType.databaseType
  driverToUse(connectionString, databaseType).then(async (result) => {
    sqlConnect(result, connectionString, 'open').then((success) => {
      if (success === true) {
        res.send(constructRetrievedResponse(success))
      } else {
        res.status(400).send(badRequest('Error occured in connection'))
      }
    }, (err) => {
      res.status(400).send(badRequest(err.message))
    })
  })
}

exports.dbDisConnect = async (req, res) => {
  const connectionString = req.query.connectionString
  const databaseType = req.query.databaseType.databaseType
  driverToUse(connectionString, databaseType).then(async (result) => {
    sqlConnect(result, connectionString, 'close').then((success) => {
      if (success === true) {
        res.send(constructRetrievedResponse(success))
      } else {
        res.status(400).send(badRequest('Error occured in connection'))
      }
    }, (err) => {
      res.status(400).send(badRequest(err.message))
    })
  })
}
