const { badRequest, ok } = require("../HttpHandlers/responseBuilder");
const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const express = require("express");
const formidable = require("formidable");
const log = require("../helper/logger");
const chalk = require("chalk");
const _mimeArray = [];

function constructRetrievedResponse(result) {
  if (result.length > 0) {
    return ok({
      data: result,
    });
  } else {
    result = result.message;
    return badRequest("Request is bad", result);
  }
}

function readFiles(req) {
  return new Promise((resolve, reject) => {
    if (req.url === "/dbMimeReader") {
      let form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        let oldpath = files.mimeFile.filepath;
        let newpath =
          ".\\bin\\services\\blobMims\\" + files.mimeFile.originalFilename;
        fs.rename(oldpath, newpath, function (err) {
          if (err) throw err;
          log.info(chalk.blue("File uploaded: " + newpath));
          resolve(newpath);
        });
      });
    }
  });
}

_readMimeFileToBuffer = async function (_mimeFilePath, res) {
  try {
    this._fileBuff = await readFile(_mimeFilePath);
    return this._fileBuff;
  } catch (err) {
    log.error(`Error while reading file to buffer: ${err}`);
    return err;
  }
};

_readMimeArray = async function (_fileBuff) {
  let slot, mimeData;
  const mimeCount = parseInt(_fileBuff.length / 584);
  for (let i = 0; i < mimeCount; i++) {
    mimeData = _readMime(i);
  }
  fs.writeFileSync("./mimeData.json", JSON.stringify(_mimeArray));
  log.info("Mime Details from File are = ", _mimeArray);
};

_readMime = async function (slot) {
  const mime = {};
  const offset = slot * 584;
  if (this.readInt(offset + 4) > 0) {
    mime.hidden = 1;
  } else {
    mime.hidden = 0;
  }
  mime.BlobType = this.readInt(offset + 8);
  mime.extension = this.readString(offset + 12);
  mime.name = this.readString(offset + 76);
  mime.textConverter = this.readString(offset + 328);
  _mimeArray.push(mime);
  return mime;
};

readInt = function (offset) {
  return this._fileBuff.readUInt32LE(offset);
};

readString = function (offset) {
  const end = this._fileBuff.indexOf(0, offset);
  return this._fileBuff.slice(offset, end).toString(); // ascii? utf8?
};
exports.dbMime = (req, res) => {
  readFiles(req).then(async (result) => {
    this._mimeFilePath = result;
    //this._mimeFilePath = "C:\\these are not the droids you are looking for";
    this._fileBuff = null;
    if (this._fileBuff === null) {
      result = await _readMimeFileToBuffer(this._mimeFilePath);
      if (result.message) {
        res.status(400).send(badRequest(result.message));
      } else if (_fileBuff !== null) {
        bret = _readMimeArray(_fileBuff);
        res.send(constructRetrievedResponse(_mimeArray));
      }
    }
  });
};
