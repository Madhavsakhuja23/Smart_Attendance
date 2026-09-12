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

module.exports = {
    getAddonStatus,
    syncAddonClasses,
    getTeacherAddonStatus
};