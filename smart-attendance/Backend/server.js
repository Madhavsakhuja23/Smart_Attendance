const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
const helmet = require("helmet");

const connectDB = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimiter");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const addonRoutes = require("./routes/addonRoutes");

dotenv.config();

const app = express();

connectDB();


// ==========================================
// SECURITY HEADERS
// ==========================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));


// ==========================================
// CORS
// ==========================================

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://smart-attendance-cu.vercel.app";

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = isProduction
    ? [FRONTEND_URL,"https://www.smartattendancesystem.in"]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        FRONTEND_URL
    ];

const corsOptions = {
    origin: function (origin, callback) {

        // Allow server-to-server requests (Add-on UrlFetchApp, Postman)
        // These have no Origin header. This is safe because
        // all sensitive endpoints require Bearer token auth.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error("Not allowed by CORS")
        );
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],

    credentials: false,

    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));


// ==========================================
// COMPRESSION
// ==========================================

app.use(compression());


// ==========================================
// RATE LIMITING
// ==========================================

app.use("/api/", generalLimiter);


// ==========================================
// SLOW REQUEST LOGGING
// ==========================================

app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;

        if (duration > 2000) {
            console.warn(
                `Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`
            );
        }
    });

    next();
});


// ==========================================
// BODY PARSING
// ==========================================

app.use(express.json({ limit: "10mb" }));


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Smart Attendance Backend is running"
    });
});


// ==========================================
// ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/addon", addonRoutes);


// ==========================================
// GENERIC ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);

    res.status(err.status || 500).json({
        status: "error",
        message: "Something went wrong. Please try again."
    });
});


// ==========================================
// START
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});