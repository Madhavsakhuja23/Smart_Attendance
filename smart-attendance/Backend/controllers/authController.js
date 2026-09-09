const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Teacher = require("../models/Teacher");

const loginTeacher = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required."
            });
        }

        // Find teacher
        const teacher = await Teacher.findOne({
            email: email.toLowerCase()
        });

        if (!teacher) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password."
            });
        }

        // Check account status
        if (teacher.status !== "active") {
            return res.status(403).json({
                status: "error",
                message: "Your account is inactive. Please contact the administrator."
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            teacher.passwordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password."
            });
        }

        // Update login time (fire-and-forget — don't wait for save)
        teacher.lastLoginAt = new Date();
        teacher.save().catch((err) => {
            console.error("Failed to update lastLoginAt:", err.message);
        });

        // Create JWT
        const token = jwt.sign(
            {
                teacherId: teacher.teacherId,
                role: teacher.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            status: "success",
            message: "Login successful.",
            token,
            teacher: {
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                role: teacher.role,
                appsScriptUrl: teacher.appsScriptUrl,
                lastLoginAt: teacher.lastLoginAt
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error during login."
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            teacherId: req.teacher.teacherId
        }).select("-passwordHash");

        if (!teacher) {
            return res.status(404).json({
                status: "error",
                message: "Teacher not found."
            });
        }

        return res.status(200).json({
            status: "success",
            teacher
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error."
        });
    }
};

module.exports = {
    loginTeacher,
    getProfile
};