const Teacher = require("../models/Teacher");
const crypto = require("crypto");


// =========================
// GET CLASSES
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
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to fetch classes."
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
        console.error("Generate pairing code error:", error.message);

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
        teacher.setupCompleted = true;

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
        console.error("Pair Add-on error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Unable to connect Google Sheet."
        });
    }
};


module.exports = {
    getClasses,
    generatePairingCode,
    pairAddon
};