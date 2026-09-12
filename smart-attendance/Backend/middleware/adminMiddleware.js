/**
 * Admin-only middleware.
 *
 * Must be used AFTER the `protect` middleware (which sets req.teacher from JWT).
 * Checks that the authenticated user has the "admin" role.
 */
const requireAdmin = (req, res, next) => {
    if (!req.teacher || req.teacher.role !== "admin") {
        return res.status(403).json({
            status: "error",
            message: "Admin access required."
        });
    }

    next();
};

module.exports = requireAdmin;
