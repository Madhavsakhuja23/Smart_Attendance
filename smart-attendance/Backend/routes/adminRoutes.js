const express = require("express");

const {
    createTeacher
} = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/teachers", protect, requireAdmin, createTeacher);

module.exports = router;