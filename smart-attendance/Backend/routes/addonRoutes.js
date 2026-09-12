const express = require("express");

const {
    getAddonStatus,
    syncAddonClasses,
    getNextAddonCommand,
    submitAddonCommandResult,
    disconnectAddon
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

router.get(
    "/commands/next",
    addonAuth,
    getNextAddonCommand
);

router.post(
    "/commands/result",
    addonAuth,
    submitAddonCommandResult
);

router.post("/disconnect", addonAuth, disconnectAddon);

module.exports = router;