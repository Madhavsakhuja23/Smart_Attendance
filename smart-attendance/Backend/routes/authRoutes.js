const express = require("express");

const {
    registerTeacher,
    loginTeacher,
    getProfile
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerTeacher);

router.post("/login", loginTeacher);

router.get("/profile", protect, getProfile);

module.exports = router;