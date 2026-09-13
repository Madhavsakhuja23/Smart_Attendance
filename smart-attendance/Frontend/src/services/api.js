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


// =========================================================
// FETCH STUDENTS
// =========================================================

export async function fetchStudents(className) {
    const { commandId } =
        await createAttendanceCommand(
            "FETCH_STUDENTS",
            {
                className
            }
        );

    return await waitForAttendanceCommand(
        commandId
    );
}

// =========================================================
// CREATE SESSION
// =========================================================

export function createSession(className) {
    return attendanceCommand(
        "CREATE_SESSION",
        {
            className
        },
        {
            timeout: 30000
        }
    );
}


// =========================================================
// SEND EMAILS
// =========================================================

export function sendEmails({
    className,
    date,
    sessionId,
    students
}) {
    return attendanceCommand(
        "SEND_EMAILS",
        {
            className,
            date,
            sessionId,
            students
        },
        {
            timeout: 120000
        }
    );
}


// =========================================================
// MARK PRESENT
// =========================================================

export function markPresent({
    className,
    rollNumber,
    date,
    sessionId
}) {
    return attendanceCommand(
        "MARK_PRESENT",
        {
            className,
            rollNumber,
            date,
            sessionId
        },
        {
            timeout: 30000
        }
    );
}


// =========================================================
// FINALIZE DAY
// =========================================================

export function finalizeDay({
    className,
    sessionId
}) {
    return attendanceCommand(
        "FINALIZE_DAY",
        {
            className,
            sessionId
        },
        {
            timeout: 30000
        }
    );
}

export async function getAttendanceCommandResult(
    commandId
) {
    const token =
        sessionStorage.getItem("token");

    const response =
        await fetch(
            `${BACKEND_URL}/api/teacher/attendance/command/${commandId}`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Unable to get command result."
        );
    }

    return data;
}

// =========================================================
// ATTENDANCE STATUS
// =========================================================

export function getAttendanceStatus(className) {
    return attendanceCommand(
        "GET_ATTENDANCE_STATUS",
        {
            className
        },
        {
            timeout: 30000
        }
    );
}


// =========================================================
// EMAIL QUEUE STATUS
// =========================================================

export function getEmailQueueStatus({
    sessionId
}) {
    return attendanceCommand(
        "GET_EMAIL_QUEUE_STATUS",
        {
            sessionId
        },
        {
            timeout: 30000
        }
    );
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

// =========================================================
// ATTENDANCE COMMAND BRIDGE
// =========================================================

async function createAttendanceCommand(type, payload = {}) {
    const token = sessionStorage.getItem("token");

    const response = await fetch(
        `${BACKEND_URL}/api/teacher/attendance/command`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                type,
                payload
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Unable to create attendance command."
        );
    }

    return data;
}

// =========================================================
// WAIT FOR ADD-ON RESULT
// =========================================================

async function waitForAttendanceCommand(
    commandId
) {
    const token =
        sessionStorage.getItem("token");

    const maxAttempts = 60;

    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {
        const response = await fetch(
            `${BACKEND_URL}/api/teacher/attendance/command/${commandId}`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to check attendance command."
            );
        }

        if (
            data.commandStatus ===
            "COMPLETED"
        ) {
            return data.result;
        }

        if (
            data.commandStatus ===
            "FAILED"
        ) {
            throw new Error(
                data.errorMessage ||
                "Attendance command failed."
            );
        }

        // Still PENDING / PROCESSING
        await new Promise(
            resolve =>
                setTimeout(resolve, 2000)
        );
    }

    throw new Error(
        "Attendance command timed out. Please make sure the Smart Attendance Add-on is open in your Google Sheet."
    );
}

// =========================================================
// EXECUTE ATTENDANCE THROUGH ADD-ON
// =========================================================

async function attendanceCommand(
    action,
    data = {},
    options = {}
) {
    const command =
        await createAttendanceCommand(
            action,
            data
        );

    return waitForAttendanceCommand(
        command.commandId,
        options
    );
}