// A set of shared utilities used by multiple databaes engine implementations

const _ = require('underscore');
//const q = require('q');
const path = require('path');

//Logger
//TODO : Add logger back in
//const logger = require("../../helper/logger") //log processor
//const chalk = require("chalk");
var log;

function resolveSQL(sqlDef, engineType, prefix) {

    var err = null, ret = null;

    try {
        if (sqlDef) {
            var st;
            if (_.isArray(sqlDef)) {
                st = _.map(sqlDef, function(def, ix) { return def[engineType] ? def[engineType] : def.sql; });
            }
            else {
                st = sqlDef[engineType] ? sqlDef[engineType] : sqlDef.sql;
            }
            if (!st) {
                err = {message: "No SQL statement found"};
            }
            else {
                if (_.isArray(st))
                    st = _.map(st, function(def, ix){ return {statement: def.statement.replace(/\<root\>/g, prefix + "_"), params: def.params }; });
                else {
                    st.statement = st.statement.replace(/\<root\>/g, prefix + "_");                
                }
                ret = st;
            }
        }
        else {
            err = {message: "No SQL statement passed"};
        }
    }
    catch(e) {
        err = _.extend(e, st);
        err.message = "Failed to resolve SQL statement: " + err.message;
    }

    if (err)
        return q.reject(err);
    else 
        return q(ret);
}

function _checkIndex(thisId, thisColName, checkCols, track) {
    var bFound = false;
    if (thisId != track.lastIndexId) {
        if (track.cols.length == checkCols.length) {
            var bAll = !bFound;
            _.each(track.cols, function(col){
                if (bAll && _.isUndefined(_.find(checkCols, function(ipCol) { return (ipCol.toUpperCase() == col.toUpperCase()); }))) {
                    bAll = false;
                }
            });
            if (bAll) {
                bFound = true;
            }
        }
        track.lastIndexId = thisId;
        track.cols = [thisColName];
    }
    else {
        track.cols.push(thisColName);
    }

    return bFound;
}

function buildIndexRet(ret, dbRows, checkCols) {
    
    var track = {
        lastIndexId: -1,
        cols: []
    };

    var lastIsUnique = false, lastIndexName = "";

    _.each(dbRows, function(row) {
        if (!ret.indexExists && _checkIndex(row.index_id, row.name, checkCols, track)) {
            ret.indexExists = true;
            ret.indexAllowed = false;
            ret.isUnique = row.is_unique;
            ret.indexName = row.index_name;
        }
        lastIsUnique = row.is_unique;
        lastIndexName = row.index_name
    });
    
    if (!ret.indexExists && _checkIndex(-2, "", checkCols, track)) {
        ret.indexExists = true;
        ret.indexAllowed = false;
        ret.isUnique = lastIsUnique;
        ret.indexName = lastIndexName;
    }

    return ret;
}

// We will assume IN if not specified. Note that this is a bitmask (IN + OUT = INOUT)
const direction = {
    IN: 1,
    OUT: 2,
    INOUT: 3
}

module.exports = {
    resolveSQL: resolveSQL,
    buildIndexRet: buildIndexRet,
    direction: direction
};