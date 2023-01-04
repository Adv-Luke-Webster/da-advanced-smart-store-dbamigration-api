const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const cors = require("cors");

const webAppOrigin = "http://localhost:3000";

router.use(
  cors({
    origin: webAppOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["X-SESSION-TOKEN"],
  })
);

//Require service modules
const dbConnectService = require("../bin/services/dbConnector");
const dbQueriesService = require("../bin/services/dbQueries");
const adsConnectService = require("../bin/services/adsConnect");
const dbMimeReaderService = require("../bin/services/dbMime");

router.get("/dbConnect", dbConnectService.dbConnect);
router.get("/dbDisConnect", dbConnectService.dbDisConnect);

router.get("/getTables", dbQueriesService.getTables);

router.get("/adsConnect", adsConnectService.adsConnect);
router.post("/dbMimeReader", dbMimeReaderService.dbMime);

module.exports = router;
