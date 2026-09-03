const express = require("express");

const {
    getClasses,
    attendanceAction
} = require("../controllers/teacherController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Get classes from teacher's spreadsheet
router.get("/classes", protect, getClasses);


// Attendance actions
router.post("/attendance", protect, attendanceAction);


module.exports = router;