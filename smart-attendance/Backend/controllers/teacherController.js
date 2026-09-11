const Teacher = require("../models/Teacher");


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
        const teacherId = req.teacher.teacherId;
        const cacheKey = `classes:${teacherId}`;

        // Check cache first
        const cached = getCached(cacheKey);

        if (cached) {
            return res.status(200).json(cached);
        }

        const result = await callAppsScript(
            teacherId,
            "getClasses"
        );

        if (result.status === "error") {
            return res.status(400).json(result);
        }

        // Cache the successful result
        setCache(cacheKey, result, CLASSES_CACHE_TTL);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Get classes error:", error);

        return res.status(500).json({
            status: "error",
            message: error.message || "Unable to fetch classes."
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



module.exports = {
    getClasses,
    attendanceAction
};