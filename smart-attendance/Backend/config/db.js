const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // Connection pool — reuse connections instead of creating new ones
            maxPoolSize: 10,
            minPoolSize: 2,

            // Timeouts — fail fast instead of hanging
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,

            // Keep-alive — prevents idle connections from being dropped
            heartbeatFrequencyMS: 10000
        });

        console.log("MongoDB connected successfully");

        // Log connection events for debugging
        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err.message);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;