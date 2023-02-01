
const _ = require('underscore')

const sqlTypes = {
  Bit: 1,
  BigInt: 2,
  Int: 3,
  TinyInt: 4,
  Numeric: 5,
  Money: 6,
  // VarBinary: 7,
  // LongVarBinary: 8,
  // WVarChar: 9,
  Double: 10,
  SmallInt: 11,
  Float: 12,
  // Real: 13,
  Char: 14,
  VarChar: 15,
  // WLongVarChar: 16,
  // Time2: 17,
  // Time: 18,
  // MyDate: 19,
  DateTime: 20,
  // DateTime2: 21,
  // DateRound: 22,
  // DateTimeOffset: 23,
  // TvpFromTable: 24,
  // Table: 25,
  // SmallMoney: 26,
  // UniqueIdentifier: 27,
  // Image: 28,
  Decimal: 29,
  // NChar: 30,
  // NVarChar: 31,
  Text: 32
  // NText: 33,
  // Xml: 34,
  // SmallDateTime: 35,
}

exports.sqlTypes = sqlTypes
