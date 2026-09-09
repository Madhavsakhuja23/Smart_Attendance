const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");

const connectDB = require("./config/db");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");

dotenv.config();

const app = express();

connectDB();

// CORS
const allowedOrigins = [
    "http://localhost:5173",
    "https://smart-attendance-cu.vercel.app"
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
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
        credentials: false
    })
);


// Gzip compression — reduces response size by 60-80%
app.use(compression());


// Request timing — logs slow requests for debugging
app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;

        if (duration > 2000) {
            console.warn(
                `⚠ Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`
            );
        }
    });

    next();
});


app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Smart Attendance Backend is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});