const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)
const express = require('express')
const bodyParser = require('body-parser')

exports.dbMime = async (req, res) => {
  _readMimeFileToBuffer = async function (_mimeFilePath) {
    try {
      this._fileBuff = await readFile(_mimeFilePath)
      return this._fileBuff
    } catch (ex) {
      console.error(`Error while reading file to buffer: ${ex}`)
    }
  }

  _readMimeArray = async function (_fileBuff) {
    let slot, mimeData
    const mimeCount = parseInt(_fileBuff.length / 584)
    for (let i = 0; i < mimeCount; i++) {
      mimeData = _readMime(i)
    }
    fs.writeFileSync('./mimeData.json', JSON.stringify(_mimeArray))
    console.log('Mime Details from File are = ', _mimeArray)
  }

  _readMime = async function (slot) {
    const mime = {}
    const offset = slot * 584
    if (this.readInt(offset + 4) > 0) {
      mime.hidden = 1
    } else {
      mime.hidden = 0
    }
    mime.BlobType = this.readInt(offset + 8)
    mime.extension = this.readString(offset + 12)
    mime.name = this.readString(offset + 76)
    mime.textConverter = this.readString(offset + 328)
    _mimeArray.push(mime)
    return mime
  }

  readInt = function (offset) {
    return this._fileBuff.readUInt32LE(offset)
  }

  readString = function (offset) {
    const end = this._fileBuff.indexOf(0, offset)
    return this._fileBuff.slice(offset, end).toString() // ascii? utf8?
  }

  this._mimeFilePath = './BLOB.mim'
  this._fileBuff = null
  const _mimeArray = []
  let bret = false
  if (this._fileBuff === null) {
    await _readMimeFileToBuffer(this._mimeFilePath)
  }

  if (_fileBuff !== null) {
    bret = _readMimeArray(_fileBuff)
  }
  res.send(_mimeArray)
}
