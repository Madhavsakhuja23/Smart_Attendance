const crypto = require("crypto");
const Teacher = require("../models/Teacher");

const addonAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "error",
                message: "Add-on connection token is required."
            });
        }

        const connectionToken = authHeader.split(" ")[1];

        if (!connectionToken) {
            return res.status(401).json({
                status: "error",
                message: "Add-on connection token is required."
            });
        }

        // Hash the token received from the Add-on
        const connectionTokenHash = crypto
            .createHash("sha256")
            .update(connectionToken)
            .digest("hex");

        // Find the connected teacher
        const teacher = await Teacher.findOne({
            connectionTokenHash,
            googleConnected: true,
            status: "active"
        });

        if (!teacher) {
            return res.status(401).json({
                status: "error",
                message: "Invalid or disconnected Add-on."
            });
        }

        // Attach teacher to request
        req.teacher = teacher;

        next();

    } catch (error) {
        console.error("Add-on authentication error:", error);

        return res.status(401).json({
            status: "error",
            message: "Unable to authenticate Add-on."
        });
    }
};

module.exports = addonAuth;