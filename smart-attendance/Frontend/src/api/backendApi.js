const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const request = async (endpoint, options = {}) => {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
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