const express = require("express");

const {
    createTeacher
} = require("../controllers/adminController");

const router = express.Router();

router.post("/teachers", createTeacher);

module.exports = router;