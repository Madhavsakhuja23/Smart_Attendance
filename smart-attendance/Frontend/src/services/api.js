const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";


const DEFAULT_TIMEOUT = 20000; // 20 seconds


/**
 * In-flight request deduplication.
 * Prevents the same action from being fired multiple times simultaneously.
 */
const inflightRequests = new Map();


async function request(action, data = {}, options = {}) {

    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Please login first.");
    }

    // Dedup — same action + same className = same request
    const dedupKey = options.dedup
        ? `${action}:${data.className || ""}`
        : null;

    if (dedupKey && inflightRequests.has(dedupKey)) {
        return inflightRequests.get(dedupKey);
    }

    const promise = (async () => {
        // AbortController — fail after timeout
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            options.timeout || DEFAULT_TIMEOUT
        );

        try {
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
                    }),

                    signal: controller.signal
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

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Request timed out. Please try again."
                );
            }

            throw error;

        } finally {
            clearTimeout(timeout);

            if (dedupKey) {
                inflightRequests.delete(dedupKey);
            }
        }
    })();

    if (dedupKey) {
        inflightRequests.set(dedupKey, promise);
    }

    return promise;
}


// Fetch students
export function fetchStudents(className) {
    return request("fetchStudents", {
        className
    }, { dedup: true });
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
    }, { timeout: 60000 });
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
    }, { dedup: true });
}

export async function getEmailQueueStatus({ sessionId }){
    return request("getEmailQueueStatus", {
        sessionId
    });
}

// ==========================================
// GOOGLE SHEETS ADD-ON SETUP
// ==========================================

export async function generatePairingCode() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Please login first.");
    }

    const response = await fetch(
        `${BACKEND_URL}/api/teacher/addon/generate-pairing-code`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        }
    );

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok || result.status === "error") {
        throw new Error(
            result.message || "Unable to generate pairing code."
        );
    }

    return result;
}


// ==========================================
// CHECK ADD-ON CONNECTION
// ==========================================

export async function getAddonConnectionStatus() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Please login first.");
    }

    const response = await fetch(
        `${BACKEND_URL}/api/teacher/addon/status`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok || result.status === "error") {
        throw new Error(
            result.message || "Unable to check Add-on connection."
        );
    }

    return result;
}