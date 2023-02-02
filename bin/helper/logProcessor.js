'use strict'
/// ///////////////////////////////////////////////////////////////////////////////
//
// Module Desc : Sets up a roating log file, or simply to the console depending on
//               the config setting, utilises windsor
// Author      : Lindsay Kemp
// Date        : 10/02/2017
//
/// ///////////////////////////////////////////////////////////////////////////////
const winston = require('winston') // logging
winston.transports.DailyRotateFile = require('winston-daily-rotate-file') // change log file on a daily basis

const Promise = require('bluebird') // override default promise to enable promisifyAll
const fs = Promise.promisifyAll(require('fs')) // file system promisified
const path = require('path') // path help
const _ = require('underscore') // js helper
const Moment = require('moment') // time formatting help

let setUp = false
let logger
let configProc
let LogPath

//
// Description : deletes logs that are passed the user specified time
// Date        : 01/03/2017
//
const deleteOldLogs = function () {
  return new Promise(
    function (resolve, reject) {
      if (!_.isUndefined(configProc)) {
        try {
          const timePurge = configProc.get('logPurge')
          const m = new Moment()
          // todo : we need to parameterise the directory path
          // if (!fs.existsSync(attachmentPath))
          // {
          //     // make the directory path
          // }
          return fs.readdirAsync(LogPath).then(
            function (files) {
              if (files.length) {
                return Promise.each(files,
                  function (file) {
                    try {
                      const fileDate = file.split('.')[0]
                      const tm = new Moment(fileDate, 'YYYY-MM-DD')
                      const dateDiff = m.diff(tm, 'days')
                      if (dateDiff > timePurge) {
                        return fs.unlinkAsync(path.join(LogPath, file))
                      } else {
                        resolve(true)
                      }
                    } catch (err) {
                      reject(err)
                    }
                  },
                  function (err) {
                    reject(err)
                  })
              } else { resolve(true) }
            },
            function (err) {
              reject(err)
            })
        } catch (err) {
          reject(err)
        }
      } else {
        const err = 'configuration not understood:'
        reject(err)
      }
    })
}

//
// Description : formats the logs that go out to the file logger transport
//               Currently removes the colourified strings that the console window gets
// Remarks     : Due to a bug in winston at the moment, unless you choose not to output in JSON it does not
// Date        : 10/03/2017
//
const formatter = function (args) {
  // eslint-disable-next-line
  args.message = args.message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
  let first = true
  const addFunc = (title, msg) => { return ((first) ? '' : ',') + '"' + title + '":"' + msg + '"' }
  let retval = '{'
  retval += addFunc('level', args.level)
  first = false
  retval += addFunc('message', args.message)
  retval += addFunc('timestamp', new Moment(new Date()).format('YYYY-MM-DD HH:mm:ss'))
  retval += '}'
  return retval
}

const setUpLogs = function (config, logPath) {
  // Set up logger
  configProc = config
  LogPath = logPath
  let lmode = config.get('logMode')
  let llevel = (_.isUndefined(config.get('fileLogLevel')) ? 'verbose' : config.get('fileLogLevel').toLowerCase())
  if (llevel !== 'info' && llevel !== 'warn' && llevel !== 'verbose' && llevel === 'error') {
    llevel = 'verbose'
  }

  if (_.isUndefined(lmode)) {
    if (llevel === 'verbose') { lmode = 4 } else { lmode = 3 }
  }

  if (!fs.existsSync(LogPath)) {
    console.log('log dir not found, creating now to ' + LogPath)
    fs.mkdirSync(LogPath)
  }

  const customLogLevels =
    {
      error: 0,
      audit: 1,
      warn: 2,
      info: 3,
      verbose: 4
    }
  const customTransports = []
  if (lmode === 1 || lmode === 3 || lmode === 4) {
    // console logging
    customTransports.push(new (winston.transports.Console)(
      {
        level: 'info'
      }))
  }
  if (lmode === 2 || lmode === 3 || lmode === 4) {
    // file logging
    const logFileName = config.get('logFileName') || 'system.log'
    customTransports.push(new winston.transports.DailyRotateFile({
      name: 'standardRotate',
      filename: path.join(LogPath, logFileName),
      datePattern: '.yyyy-MM-dd',
      prepend: true,
      level: llevel,
      json: false,
      formatter
    }))
  }
  let seperateLogFileForAudit = config.get('seperateLogFileForAudit')
  if (_.isUndefined(seperateLogFileForAudit)) seperateLogFileForAudit = false
  if (seperateLogFileForAudit) {
    customTransports.push(new winston.transports.DailyRotateFile({
      name: 'auditRotate',
      filename: path.join(LogPath, 'AUDIT.log'),
      datePattern: '.yyyy-MM-dd',
      prepend: true,
      level: 'audit',
      json: false,
      formatter
    }))
  }

  logger = new (winston.Logger)(
    {
      transports: customTransports,
      levels: customLogLevels
    })
  logger.emitErrs = true
  setUp = true
  return logger
}

module.exports =
{
  setUpLogs,
  setUp,
  logger,
  deleteOldLogs
}
