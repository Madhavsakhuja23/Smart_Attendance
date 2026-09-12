const Teacher = require("../models/Teacher");
const crypto = require("crypto");
const AttendanceCommand = require("../models/AttendanceCommand");
// =========================
// IN-MEMORY CACHE
// =========================

/**
 * Simple TTL cache to avoid redundant DB/Apps Script calls.
 *
 * Key → { data, expiresAt }
 */
const cache = new Map();

const TEACHER_CACHE_TTL = 2 * 60 * 1000;   // 2 minutes
const CLASSES_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes


function getCached(key) {
    const entry = cache.get(key);

    if (!entry) {
        return null;
    }

    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}


function setCache(key, data, ttl) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttl
    });
}


// =========================
// TEACHER LOOKUP (cached)
// =========================

const getTeacher = async (teacherId) => {
    const cacheKey = `teacher:${teacherId}`;
    const cached = getCached(cacheKey);

    if (cached) {
        return cached;
    }

    const teacher = await Teacher.findOne({
        teacherId,
        status: "active"
    });

    if (!teacher) {
        throw new Error("Teacher not found.");
    }

    if (!teacher.appsScriptUrl) {
        throw new Error("Apps Script URL is not configured.");
    }

    setCache(cacheKey, teacher, TEACHER_CACHE_TTL);

    return teacher;
};


// =========================
// APPS SCRIPT CALL (with timeout)
// =========================

const APPS_SCRIPT_TIMEOUT = 25000; // 25 seconds

const callAppsScript = async (teacherId, action, data = {}, timeoutMs) => {
    const teacher = await getTeacher(teacherId);

    // AbortController — fail after timeout instead of hanging forever
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs || APPS_SCRIPT_TIMEOUT
    );

    try {
        const response = await fetch(teacher.appsScriptUrl, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action,
                ...data
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Apps Script error: ${response.status}`);
        }

        const result = await response.json();

        return result;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "Apps Script request timed out. Please try again."
            );
        }

        throw error;

    } finally {
        clearTimeout(timeout);
    }
};


// =========================
// GET CLASSES (cached)
// =========================

const getClasses = async (req, res) => {
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

        if (!teacher.googleConnected) {
            return res.status(400).json({
                status: "error",
                message: "Google Sheet is not connected."
            });
        }

        const classes = Array.isArray(teacher.connectedClasses)
            ? teacher.connectedClasses
            : [];

        return res.status(200).json({
            status: "success",
            classes: classes
        });

    } catch (error) {

        console.error(
            "Get teacher classes error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to fetch classes."
        });
    }
};

// =========================
// ATTENDANCE ACTION
// =========================

const attendanceAction = async (req, res) => {
    try {
        const { action, ...data } = req.body;

        if (!action) {
            return res.status(400).json({
                status: "error",
                message: "Action is required."
            });
        }

        const allowedActions = [
            "fetchStudents",
            "createSession",
            "sendEmails",
            "getEmailQueueStatus",
            "verifyAndMarkPresent",
            "finalizeDay",
            "getAttendanceStatus"
        ];

        if (!allowedActions.includes(action)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid attendance action."
            });
        }

        // sendEmails carries all QR base64 images — needs a longer timeout
        const timeout = action === "sendEmails" ? 55000 : APPS_SCRIPT_TIMEOUT;

        const result = await callAppsScript(
            req.teacher.teacherId,
            action,
            data,
            timeout
        );

        if (result.status === "error") {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("Attendance action error:", error);

        return res.status(500).json({
            status: "error",
            message: error.message || "Attendance request failed."
        });
    }
};

// =========================
// GENERATE ADD-ON PAIRING CODE
// =========================

const generatePairingCode = async (req, res) => {
    try {
        const teacherId = req.teacher.teacherId;

        const teacher = await Teacher.findOne({
            teacherId,
            status: "active"
        });

        if (!teacher) {
            return res.status(404).json({
                status: "error",
                message: "Teacher not found."
            });
        }

        // Generate a secure random 6-character code
        const randomPart = crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()
            .slice(0, 6);

        const pairingCode = `SA-${randomPart}`;

        // Store only the hash, never the actual code
        const pairingCodeHash = crypto
            .createHash("sha256")
            .update(pairingCode)
            .digest("hex");

        // Code is valid for 10 minutes
        const pairingCodeExpiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        teacher.pairingCodeHash = pairingCodeHash;
        teacher.pairingCodeExpiresAt = pairingCodeExpiresAt;

        await teacher.save();

        return res.status(200).json({
            status: "success",
            message: "Pairing code generated successfully.",
            pairingCode,
            expiresAt: pairingCodeExpiresAt
        });

    } catch (error) {
        console.error("Generate pairing code error:", error);

        return res.status(500).json({
            status: "error",
            message: "Unable to generate pairing code."
        });
    }
};

// =========================
// PAIR GOOGLE SHEETS ADD-ON
// =========================

const pairAddon = async (req, res) => {
    try {
        const {
            pairingCode,
            googleEmail,
            spreadsheetId,
            spreadsheetName
        } = req.body;

        // -------------------------
        // Validate input
        // -------------------------

        if (
            !pairingCode ||
            !googleEmail ||
            !spreadsheetId ||
            !spreadsheetName
        ) {
            return res.status(400).json({
                status: "error",
                message: "Pairing code, Google email, spreadsheet ID and spreadsheet name are required."
            });
        }

        // -------------------------
        // Hash supplied pairing code
        // -------------------------

        const pairingCodeHash = crypto
            .createHash("sha256")
            .update(pairingCode.trim())
            .digest("hex");

        // -------------------------
        // Find teacher using pairing code
        // -------------------------

        const teacher = await Teacher.findOne({
            pairingCodeHash,
            status: "active"
        });

        if (!teacher) {
            return res.status(400).json({
                status: "error",
                message: "Invalid pairing code."
            });
        }

        // -------------------------
        // Check expiration
        // -------------------------

        if (
            !teacher.pairingCodeExpiresAt ||
            teacher.pairingCodeExpiresAt.getTime() < Date.now()
        ) {
            return res.status(400).json({
                status: "error",
                message: "Pairing code has expired. Please generate a new code."
            });
        }

        // -------------------------
        // Generate connection token
        // -------------------------

        const connectionToken = crypto
            .randomBytes(32)
            .toString("hex");

        const connectionTokenHash = crypto
            .createHash("sha256")
            .update(connectionToken)
            .digest("hex");

        // -------------------------
        // Save connection
        // -------------------------

        teacher.googleEmail = googleEmail.trim().toLowerCase();
        teacher.googleConnected = true;

        teacher.connectedSpreadsheetId = spreadsheetId.trim();
        teacher.connectedSpreadsheetName = spreadsheetName.trim();

        teacher.connectionTokenHash = connectionTokenHash;
        teacher.connectionTokenCreatedAt = new Date();

        // Pairing code is one-time use
        teacher.pairingCodeHash = null;
        teacher.pairingCodeExpiresAt = null;

        await teacher.save();

        // -------------------------
        // Response
        // -------------------------

        return res.status(200).json({
            status: "success",
            message: "Google Sheet connected successfully.",
            connectionToken,
            teacher: {
                teacherId: teacher.teacherId,
                googleEmail: teacher.googleEmail,
                spreadsheetId: teacher.connectedSpreadsheetId,
                spreadsheetName: teacher.connectedSpreadsheetName
            }
        });

    } catch (error) {
        console.error("Pair Add-on error:", error);

        return res.status(500).json({
            status: "error",
            message: "Unable to connect Google Sheet."
        });
    }
};

// =========================
// CREATE ADD-ON COMMAND
// =========================

const createAttendanceCommand = async (req, res) => {
    try {
        const { action, ...data } = req.body;

        if (!action) {
            return res.status(400).json({
                status: "error",
                message: "Action is required."
            });
        }

        const actionMap = {
            fetchStudents: "FETCH_STUDENTS",
            createSession: "CREATE_SESSION",
            verifyAndMarkPresent: "MARK_PRESENT",
            finalizeDay: "FINALIZE_DAY",
            getAttendanceStatus: "GET_ATTENDANCE_STATUS",
            sendEmails: "SEND_EMAILS",
            getEmailQueueStatus: "GET_EMAIL_QUEUE_STATUS"
        };

        const commandType = actionMap[action];

        if (!commandType) {
            return res.status(400).json({
                status: "error",
                message: "Invalid attendance action."
            });
        }

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

        if (
            !teacher.googleConnected ||
            !teacher.connectedSpreadsheetId
        ) {
            return res.status(400).json({
                status: "error",
                message: "Google Sheet is not connected."
            });
        }

        const command = await AttendanceCommand.create({
            teacherId: teacher.teacherId,

            spreadsheetId:
                teacher.connectedSpreadsheetId,

            type: commandType,

            payload: data,

            status: "PENDING",

            expiresAt: new Date(
                Date.now() + 5 * 60 * 1000
            )
        });

        return res.status(201).json({
            status: "success",
            message: "Attendance command created.",
            commandId: command._id
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

// =========================
// GET ATTENDANCE COMMAND RESULT
// =========================

const getAttendanceCommandResult = async (req, res) => {
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

        const { commandId } = req.params;

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

        return res.status(200).json({
            status: "success",

            command: {
                id: command._id,
                type: command.type,
                status: command.status,
                result: command.result,
                errorMessage:
                    command.errorMessage,
                createdAt:
                    command.createdAt,
                processedAt:
                    command.processedAt
            }
        });

    } catch (error) {

        console.error(
            "Get attendance command result error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message:
                "Unable to retrieve command result."
        });
    }
};

module.exports = {
    getClasses,
    attendanceAction,
    generatePairingCode,
    pairAddon,
    createAttendanceCommand,
    getAttendanceCommandResult
};