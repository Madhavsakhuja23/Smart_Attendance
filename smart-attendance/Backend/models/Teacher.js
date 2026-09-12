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

        // ==========================================
        // OLD APPS SCRIPT CONNECTION
        // Keep temporarily during migration
        // ==========================================
        appsScriptUrl: {
            type: String,
            required: false,
            default: null,
            trim: true
        },

        // ==========================================
        // NEW GOOGLE SHEETS ADD-ON CONNECTION
        // ==========================================

        googleEmail: {
            type: String,
            required: false,
            default: null,
            lowercase: true,
            trim: true
        },

        googleConnected: {
            type: Boolean,
            default: false
        },

        connectedSpreadsheetId: {
            type: String,
            required: false,
            default: null,
            trim: true
        },

        connectedSpreadsheetName: {
            type: String,
            required: false,
            default: null,
            trim: true
        },

        // ==========================================
        // PAIRING
        // ==========================================

        pairingCodeHash: {
            type: String,
            required: false,
            default: null
        },

        pairingCodeExpiresAt: {
            type: Date,
            required: false,
            default: null
        },

        // ==========================================
        // ADD-ON AUTHENTICATION
        // ==========================================

        connectionTokenHash: {
            type: String,
            required: false,
            default: null
        },

        connectionTokenCreatedAt: {
            type: Date,
            required: false,
            default: null
        },

        // ==========================================

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
        },

        setupCompleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Teacher", teacherSchema);