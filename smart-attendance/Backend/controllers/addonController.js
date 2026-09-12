const Teacher = require("../models/Teacher");
const AttendanceCommand = require("../models/AttendanceCommand");
// =========================
// ADD-ON CONNECTION STATUS
// =========================

const getAddonStatus = async (req, res) => {
    try {
        const teacher = req.teacher;

        return res.status(200).json({
            status: "success",
            connected: true,

            teacher: {
                teacherId: teacher.teacherId,
                googleEmail: teacher.googleEmail,
                spreadsheetId: teacher.connectedSpreadsheetId,
                spreadsheetName: teacher.connectedSpreadsheetName
            }
        });

    } catch (error) {
        console.error("Add-on status error:", error);

        return res.status(500).json({
            status: "error",
            message: "Unable to retrieve Add-on connection status."
        });
    }
};

// =========================
// SYNC CLASSES FROM ADD-ON
// =========================

const syncAddonClasses = async (req, res) => {
    try {
        const { classes } = req.body;

        if (!Array.isArray(classes)) {
            return res.status(400).json({
                status: "error",
                message: "Classes must be an array."
            });
        }

        // Clean and normalize class names
        const cleanedClasses = [
            ...new Set(
                classes
                    .map(className =>
                        String(className || "").trim()
                    )
                    .filter(Boolean)
            )
        ];

        const teacher = req.teacher;

        teacher.connectedClasses = cleanedClasses;

        await teacher.save();

        return res.status(200).json({
            status: "success",
            message: "Classes synchronized successfully.",
            classes: cleanedClasses
        });

    } catch (error) {
        console.error(
            "Sync Add-on classes error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to synchronize classes."
        });
    }
};

// =========================
// TEACHER ADD-ON STATUS
// =========================

const getTeacherAddonStatus = async (req, res) => {
    try {

        const teacher = await Teacher.findOne({
            teacherId: req.teacher.teacherId,
            status: "active"
        });

        if (!teacher) {
            return res.status(404).json({
                status: "error",
                message: "Teacher not found."
            });
        }

        return res.status(200).json({
            status: "success",

            connected: Boolean(
                teacher.googleConnected &&
                teacher.connectedSpreadsheetId
            ),

            teacher: {
                teacherId: teacher.teacherId,
                googleEmail: teacher.googleEmail || null,
                spreadsheetId:
                    teacher.connectedSpreadsheetId || null,
                spreadsheetName:
                    teacher.connectedSpreadsheetName || null
            },

            classes: Array.isArray(teacher.connectedClasses)
                ? teacher.connectedClasses
                : []
        });

    } catch (error) {

        console.error(
            "Teacher Add-on status error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to check Add-on connection."
        });
    }
};

// =========================
// GET NEXT ADD-ON COMMAND
// =========================

const getNextAddonCommand = async (req, res) => {
    try {

        const teacher = req.teacher;

        const command =
            await AttendanceCommand.findOneAndUpdate(
                {
                    teacherId: teacher.teacherId,

                    spreadsheetId:
                        teacher.connectedSpreadsheetId,

                    status: "PENDING",

                    $or: [
                        { expiresAt: null },
                        { expiresAt: { $gt: new Date() } }
                    ]
                },
                {
                    $set: {
                        status: "PROCESSING"
                    }
                },
                {
                    sort: {
                        createdAt: 1
                    },
                    new: true
                }
            );

        if (!command) {
            return res.status(200).json({
                status: "success",
                command: null
            });
        }

        return res.status(200).json({
            status: "success",

            command: {
                id: command._id,

                type: command.type,

                payload: command.payload
            }
        });

    } catch (error) {

        console.error(
            "Get Add-on command error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to retrieve Add-on command."
        });
    }
};

// =========================
// SUBMIT ADD-ON COMMAND RESULT
// =========================

const submitAddonCommandResult = async (req, res) => {
    try {

        const teacher = req.teacher;

        const { commandId, status, result, errorMessage } =
            req.body;

        if (!commandId) {
            return res.status(400).json({
                status: "error",
                message: "Command ID is required."
            });
        }

        if (!["COMPLETED", "FAILED"].includes(status)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid command result status."
            });
        }

        const command =
            await AttendanceCommand.findOne({
                _id: commandId,

                teacherId: teacher.teacherId,

                spreadsheetId:
                    teacher.connectedSpreadsheetId
            });

        if (!command) {
            return res.status(404).json({
                status: "error",
                message: "Command not found."
            });
        }

        if (command.status !== "PROCESSING") {
            return res.status(400).json({
                status: "error",
                message:
                    "Command is not currently being processed."
            });
        }

        command.status = status;

        command.result =
            status === "COMPLETED"
                ? result || null
                : null;

        command.errorMessage =
            status === "FAILED"
                ? String(
                    errorMessage ||
                    "Add-on command failed."
                )
                : null;

        command.processedAt = new Date();

        await command.save();

        return res.status(200).json({
            status: "success",
            message: "Command result stored."
        });

    } catch (error) {

        console.error(
            "Submit Add-on command result error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message:
                "Unable to store command result."
        });
    }
};

// ==========================================
// CREATE ATTENDANCE COMMAND
// ==========================================

const createAttendanceCommand = async (req, res) => {
    try {
        const authTeacher = req.teacher;

if (!authTeacher || !authTeacher.teacherId) {
    return res.status(401).json({
        status: "error",
        message: "Teacher authentication required."
    });
}

// Get the complete teacher document from MongoDB
const teacher = await Teacher.findOne({
    teacherId: authTeacher.teacherId,
    status: "active"
});

if (!teacher) {
    return res.status(404).json({
        status: "error",
        message: "Teacher not found."
    });
}

        const {
            type,
            payload = {}
        } = req.body;

        const allowedTypes = [
            "FETCH_STUDENTS",
            "CREATE_SESSION",
            "MARK_PRESENT",
            "FINALIZE_DAY",
            "GET_ATTENDANCE_STATUS",
            "SEND_EMAILS",
            "GET_EMAIL_QUEUE_STATUS"
        ];

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid attendance command type."
            });
        }

        if (
            !teacher.connectedSpreadsheetId
        ) {
            return res.status(400).json({
                status: "error",
                message: "No Google Sheet is connected."
            });
        }

        const command = await AttendanceCommand.create({
            teacherId: teacher.teacherId,
            spreadsheetId: teacher.connectedSpreadsheetId,
            type,
            payload,
            status: "PENDING",

            // Command valid for 2 minutes
            expiresAt: new Date(
                Date.now() + 2 * 60 * 1000
            )
        });

        return res.status(201).json({
            status: "success",
            commandId: command._id.toString()
        });

    } catch (error) {
        console.error(
            "Create attendance command error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to create attendance command."
        });
    }
};


// ==========================================
// GET ATTENDANCE COMMAND RESULT
// ==========================================

const getAttendanceCommandResult = async (
    req,
    res
) => {
    try {
        const teacher = req.teacher;

        const command =
            await AttendanceCommand.findOne({
                _id: req.params.commandId,
                teacherId: teacher.teacherId
            });

        if (!command) {
            return res.status(404).json({
                status: "error",
                message: "Attendance command not found."
            });
        }

        return res.status(200).json({
            status: "success",
            commandId: command._id.toString(),
            commandStatus: command.status,
            result: command.result,
            errorMessage: command.errorMessage
        });

    } catch (error) {
        console.error(
            "Get attendance command result error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to retrieve command result."
        });
    }
};

module.exports = {
    getAddonStatus,
    syncAddonClasses,
    getTeacherAddonStatus,

    getNextAddonCommand,
    submitAddonCommandResult,

    createAttendanceCommand,
    getAttendanceCommandResult
};
