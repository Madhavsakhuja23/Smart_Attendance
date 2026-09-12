const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dns = require("dns").promises;

const Teacher = require("../models/Teacher");

// =========================
// VALIDATION HELPERS
// =========================

const validateEmailDomain = async (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: "Please enter a valid email address format (e.g., user@example.com)." };
    }

    const domain = email.split("@")[1]?.trim();
    if (!domain) {
        return { valid: false, message: "Invalid email domain." };
    }

    try {
        // Resolve MX records to ensure the domain can accept emails
        const mxRecords = await dns.resolveMx(domain).catch(() => []);
        if (mxRecords && mxRecords.length > 0) {
            return { valid: true };
        }

        // Fallback: Check for IPv4 A records if MX is absent
        const aRecords = await dns.resolve4(domain).catch(() => []);
        if (aRecords && aRecords.length > 0) {
            return { valid: true };
        }

        return { valid: false, message: `The email domain "${domain}" does not exist or has no mail servers configured.` };
    } catch (err) {
        return { valid: false, message: `The email domain "${domain}" could not be verified.` };
    }
};

const validatePassword = (password) => {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter (a-z)." };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain at least one number (0-9)." };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        return { valid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)." };
    }
    return { valid: true };
};

// =========================
// BACKWARD-COMPAT HELPER
// =========================

/**
 * Compute effective setup status.
 *
 * - If setupCompleted is explicitly true → true
 * - If setupCompleted is falsy but appsScriptUrl exists → true (legacy Phase 1 teacher)
 * - Otherwise → false (new self-registered teacher)
 */
const isSetupComplete = (teacher) => {
    if (teacher.setupCompleted === true) {
        return true;
    }

    // Legacy Phase 1 teachers have a valid appsScriptUrl but no setupCompleted field
    if (teacher.appsScriptUrl && teacher.appsScriptUrl.trim().length > 0) {
        return true;
    }

    return false;
};


// =========================
// REGISTER
// =========================

const registerTeacher = async (req, res) => {
    try {
        const { name, teacherId, email, password, confirmPassword } = req.body;

        // Validate required fields
        if (!name || !teacherId || !email || !password || !confirmPassword) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required."
            });
        }

        // Validate email format and DNS existence
        const emailValidation = await validateEmailDomain(email.trim());
        if (!emailValidation.valid) {
            return res.status(400).json({
                status: "error",
                message: emailValidation.message
            });
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                status: "error",
                message: "Passwords do not match."
            });
        }

        // Validate password strength requirements
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                status: "error",
                message: passwordValidation.message
            });
        }

        // Check if teacher ID already exists
        const existingTeacherId = await Teacher.findOne({ teacherId });

        if (existingTeacherId) {
            return res.status(409).json({
                status: "error",
                message: "Teacher ID already exists."
            });
        }

        // Check if email already exists
        const existingEmail = await Teacher.findOne({
            email: email.toLowerCase()
        });

        if (existingEmail) {
            return res.status(409).json({
                status: "error",
                message: "Email already registered."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create teacher — no appsScriptUrl, setupCompleted = false
        const teacher = await Teacher.create({
            teacherId,
            name,
            email,
            passwordHash,
            setupCompleted: false
        });

        // Create JWT
        const token = jwt.sign(
            {
                teacherId: teacher.teacherId,
                role: teacher.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(201).json({
            status: "success",
            message: "Account created successfully.",
            token,
            teacher: {
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                role: teacher.role,
                setupCompleted: false
            }
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error during registration."
        });
    }
};


// =========================
// LOGIN
// =========================

const loginTeacher = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required."
            });
        }

        // Find teacher
        const teacher = await Teacher.findOne({
            email: email.toLowerCase()
        });

        if (!teacher) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password."
            });
        }

        // Check account status
        if (teacher.status !== "active") {
            return res.status(403).json({
                status: "error",
                message: "Your account is inactive. Please contact the administrator."
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            teacher.passwordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                status: "error",
                message: "Invalid email or password."
            });
        }

        // Update login time (fire-and-forget — don't wait for save)
        teacher.lastLoginAt = new Date();
        teacher.save().catch((err) => {
            console.error("Failed to update lastLoginAt:", err.message);
        });

        // Compute effective setup status (backward-compat for Phase 1 teachers)
        const setupCompleted = isSetupComplete(teacher);

        // Create JWT
        const token = jwt.sign(
            {
                teacherId: teacher.teacherId,
                role: teacher.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            status: "success",
            message: "Login successful.",
            token,
            teacher: {
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                role: teacher.role,
                appsScriptUrl: teacher.appsScriptUrl,
                lastLoginAt: teacher.lastLoginAt,
                setupCompleted
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error during login."
        });
    }
};


// =========================
// PROFILE
// =========================

const getProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            teacherId: req.teacher.teacherId
        }).select("-passwordHash");

        if (!teacher) {
            return res.status(404).json({
                status: "error",
                message: "Teacher not found."
            });
        }

        // Compute effective setup status (backward-compat for Phase 1 teachers)
        const setupCompleted = isSetupComplete(teacher);

        return res.status(200).json({
            status: "success",
            teacher: {
                ...teacher.toObject(),
                setupCompleted
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            status: "error",
            message: "Server error."
        });
    }
};

module.exports = {
    registerTeacher,
    loginTeacher,
    getProfile
};