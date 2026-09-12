const express = require("express");

const {
    getClasses,
    attendanceAction,
    generatePairingCode,
    pairAddon
} = require("../controllers/teacherController");

const {
    getTeacherAddonStatus
} = require("../controllers/addonController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Get classes from teacher's spreadsheet
router.get(
    "/classes",
    protect,
    getClasses
);


// Attendance actions
router.post(
    "/attendance",
    protect,
    attendanceAction
);


// Generate Google Sheets Add-on pairing code
router.post(
    "/addon/generate-pairing-code",
    protect,
    generatePairingCode
);


// Pair Google Sheets Add-on
router.post(
    "/addon/pair",
    pairAddon
);


// Teacher Add-on connection status
router.get(
    "/addon/status",
    protect,
    getTeacherAddonStatus
);


module.exports = router;