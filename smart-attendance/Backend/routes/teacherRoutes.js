const express = require("express");

const {
    getClasses,
    attendanceAction,
    generatePairingCode,
    pairAddon,
    getTeacherAddonStatus
} = require("../controllers/teacherController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Get classes from teacher's spreadsheet
router.get("/classes", protect, getClasses);


// Attendance actions
router.post("/attendance", protect, attendanceAction);

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

router.get(
    "/addon/status",
    authMiddleware,
    getTeacherAddonStatus
);

module.exports = router;