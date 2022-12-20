const express = require('express')
const router = express.Router()
const cors = require('cors');

const webAppOrigin = "http://localhost:3000";

router.use(
    cors({
        origin: webAppOrigin,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        exposedHeaders: ["X-SESSION-TOKEN"]
    })
);

//Require service modules
const dbConnectService = require('../bin/services/dbConnector')
const adsConnectService = require('../bin/services/adsConnect')

router.get('/dbConnect', dbConnectService.dbConnect);
router.get('/dbDisConnect', dbConnectService.dbDisConnect);

router.get('/adsConnect', adsConnectService.adsConnect);

module.exports = router