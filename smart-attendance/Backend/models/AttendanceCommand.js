const mongoose = require("mongoose");

const attendanceCommandSchema = new mongoose.Schema(
    {
        teacherId: {
            type: String,
            required: true,
            index: true,
            trim: true
        },

        spreadsheetId: {
            type: String,
            required: true,
            index: true,
            trim: true
        },

        type: {
            type: String,
            required: true,
            enum: [
                "FETCH_STUDENTS",
                "CREATE_SESSION",
                "MARK_PRESENT",
                "FINALIZE_DAY",
                "GET_ATTENDANCE_STATUS",
                "SEND_EMAILS",
                "GET_EMAIL_QUEUE_STATUS"
            ]
        },

        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PROCESSING",
                "COMPLETED",
                "FAILED"
            ],
            default: "PENDING",
            index: true
        },

        result: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        errorMessage: {
            type: String,
            default: null
        },

        processedAt: {
            type: Date,
            default: null
        },

        expiresAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "AttendanceCommand",
    attendanceCommandSchema
);