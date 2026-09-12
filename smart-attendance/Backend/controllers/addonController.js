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

module.exports = {
    getAddonStatus
};