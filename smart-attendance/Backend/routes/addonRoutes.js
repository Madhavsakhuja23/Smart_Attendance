const express = require("express");

const {
    getAddonStatus,
    syncAddonClasses
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
router.post(
    "/classes/sync",
    addonAuth,
    syncAddonClasses
);


module.exports = router;