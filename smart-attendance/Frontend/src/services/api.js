const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";


async function request(action, data = {}) {

    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Please login first.");
    }

    const response = await fetch(
        `${BACKEND_URL}/api/teacher/attendance`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                action,
                ...data
            })
        }
    );


    const result = await response.json();


    if (!response.ok || result.status === "error") {

        const error = new Error(
            result.message || "Request failed."
        );

        error.code = result.code;

        throw error;
    }


    return result;
}


// Fetch students
export function fetchStudents(className) {
    return request("fetchStudents", {
        className
    });
}


// Create attendance session
export function createSession(className) {
    return request("createSession", {
        className
    });
}


// Send QR emails
export function sendEmails({
    className,
    date,
    sessionId,
    students
}) {
    return request("sendEmails", {
        className,
        date,
        sessionId,
        students
    });
}


// Mark student present
export function markPresent({
    className,
    rollNumber,
    date,
    sessionId
}) {
    return request("verifyAndMarkPresent", {
        className,
        rollNumber,
        date,
        sessionId
    });
}


// Finalize attendance
export function finalizeDay({
    className,
    sessionId
}) {
    return request("finalizeDay", {
        className,
        sessionId
    });
}


// Get attendance status
export function getAttendanceStatus(className) {
    return request("getAttendanceStatus", {
        className
    });
}