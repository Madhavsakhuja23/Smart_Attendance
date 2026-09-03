const express = require("express");

const {
    loginTeacher,
    getProfile
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", loginTeacher);

router.get("/profile", protect, getProfile);

module.exports = router;