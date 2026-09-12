const express = require("express");

const {
    getAddonStatus
} = require("../controllers/addonController");

const addonAuth = require("../middleware/addonAuthMiddleware");

const router = express.Router();


// ==========================================
// ADD-ON CONNECTION STATUS
// ==========================================

router.get(
    "/status",
    addonAuth,
    getAddonStatus
);


module.exports = router;