const express = require("express");

const {
    registerTeacher,
    loginTeacher,
    getProfile,
    changePassword
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", registerLimiter, registerTeacher);

router.post("/login", loginLimiter, loginTeacher);

router.get("/profile", protect, getProfile);

router.post("/change-password", protect, changePassword);

module.exports = router;