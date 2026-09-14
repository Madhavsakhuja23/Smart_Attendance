const rateLimit = require("express-rate-limit");

// ─────────────────────────────────────────────
// LOGIN — 10 attempts / 15 min / IP
// ─────────────────────────────────────────────

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Too many login attempts. Please try again in 15 minutes."
    }
});


// ─────────────────────────────────────────────
// REGISTER — 5 attempts / hour / IP
// ─────────────────────────────────────────────

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Too many registration attempts. Please try again later."
    }
});


// ─────────────────────────────────────────────
// PAIRING — 10 attempts / 15 min / IP
// ─────────────────────────────────────────────

const pairingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Too many pairing attempts. Please try again in 15 minutes."
    }
});


// ─────────────────────────────────────────────
// GENERAL API — 100 requests / 15 min / IP
// ─────────────────────────────────────────────

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Too many requests. Please slow down."
    }
});


module.exports = {
    loginLimiter,
    registerLimiter,
    pairingLimiter,
    generalLimiter
};
