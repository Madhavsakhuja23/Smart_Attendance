const express = require("express");

const {
    getClasses,
    generatePairingCode,
    pairAddon
} = require("../controllers/teacherController");

const {
    getTeacherAddonStatus,
    createAttendanceCommand,
    getAttendanceCommandResult,
    disconnectFromWebsite
} = require("../controllers/addonController");

const protect = require("../middleware/authMiddleware");
const { pairingLimiter } = require("../middleware/rateLimiter");

const router = express.Router();


// Get classes from teacher's spreadsheet
router.get(
    "/classes",
    protect,
    getClasses
);


// Generate Google Sheets Add-on pairing code
router.post(
    "/addon/generate-pairing-code",
    protect,
    pairingLimiter,
    generatePairingCode
);


// Pair Google Sheets Add-on
router.post(
    "/addon/pair",
    pairingLimiter,
    pairAddon
);


// Teacher Add-on connection status
router.get(
    "/addon/status",
    protect,
    getTeacherAddonStatus
);


// Disconnect Google Sheet from website
router.post(
    "/addon/disconnect",
    protect,
    disconnectFromWebsite
);


// ==========================================
// ATTENDANCE COMMAND BRIDGE
// ==========================================

router.post(
    "/attendance/command",
    protect,
    createAttendanceCommand
);

router.get(
    "/attendance/command/:commandId",
    protect,
    getAttendanceCommandResult
);

module.exports = router;