const bcrypt = require("bcryptjs");
const Teacher = require("../models/Teacher");

const createTeacher = async (req, res) => {
    try {
        const {
            teacherId,
            name,
            email,
            password,
            appsScriptUrl
        } = req.body;

        // Check required fields
        if (
            !teacherId ||
            !name ||
            !email ||
            !password ||
            !appsScriptUrl
        ) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required."
            });
        }

        // Check if teacher ID already exists
        const existingTeacherId = await Teacher.findOne({ teacherId });

        if (existingTeacherId) {
            return res.status(409).json({
                status: "error",
                message: "Teacher ID already exists."
            });
        }

        // Check if email already exists
        const existingEmail = await Teacher.findOne({
            email: email.toLowerCase()
        });

        if (existingEmail) {
            return res.status(409).json({
                status: "error",
                message: "Email already exists."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create teacher
        const teacher = await Teacher.create({
            teacherId,
            name,
            email,
            passwordHash,
            appsScriptUrl
        });

        return res.status(201).json({
            status: "success",
            message: "Teacher account created successfully.",
            teacher: {
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                appsScriptUrl: teacher.appsScriptUrl,
                role: teacher.role,
                status: teacher.status
            }
        });

    } catch (error) {
        console.error("Create teacher error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error while creating teacher."
        });
    }
};

module.exports = {
    createTeacher
};