const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        teacherId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        appsScriptUrl: {
            type: String,
            required: true,
            trim: true
        },

        role: {
            type: String,
            enum: ["teacher", "admin"],
            default: "teacher"
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Teacher", teacherSchema);