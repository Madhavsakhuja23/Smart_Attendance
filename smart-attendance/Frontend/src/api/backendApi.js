const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const DEFAULT_TIMEOUT = 15000; // 15 seconds


/**
 * In-flight request deduplication.
 * Prevents the same GET request from being fired multiple times simultaneously.
 */
const inflightRequests = new Map();


const request = async (endpoint, options = {}) => {

    // Dedup GET requests — if the same request is already in flight, reuse it
    const isGet = !options.method || options.method === "GET";
    const dedupKey = isGet ? `${endpoint}` : null;

    if (dedupKey && inflightRequests.has(dedupKey)) {
        return inflightRequests.get(dedupKey);
    }

    const promise = (async () => {
        // AbortController — fail after timeout instead of hanging
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            options.timeout || DEFAULT_TIMEOUT
        );

        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                },
                signal: controller.signal
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong.");
            }

            return data;

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("Request timed out. Please try again.");
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
};

export const loginTeacher = async (email, password) => {
    return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password
        })
    });
};

export const registerTeacher = async (name, teacherId, email, password, confirmPassword) => {
    return request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
            name,
            teacherId,
            email,
            password,
            confirmPassword
        })
    });
};

export const getTeacherProfile = async (token) => {
    return request("/api/auth/profile", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

export const getTeacherClasses = async (token) => {
    return request("/api/teacher/classes", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};