const Teacher = require("../models/Teacher");

const getTeacher = async (teacherId) => {
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

    return teacher;
};


const callAppsScript = async (teacherId, action, data = {}) => {
    const teacher = await getTeacher(teacherId);

    const response = await fetch(teacher.appsScriptUrl, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            action,
            ...data
        })
    });

    if (!response.ok) {
        throw new Error(`Apps Script error: ${response.status}`);
    }

    const result = await response.json();

    return result;
};


// Get classes
const getClasses = async (req, res) => {
    try {
        const result = await callAppsScript(
            req.teacher.teacherId,
            "getClasses"
        );

        if (result.status === "error") {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("Get classes error:", error);

        return res.status(500).json({
            status: "error",
            message: error.message || "Unable to fetch classes."
        });
    }
};


// Handle attendance-related actions
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

        const result = await callAppsScript(
            req.teacher.teacherId,
            action,
            data
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


module.exports = {
    getClasses,
    attendanceAction
};