"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_1 = require("../utils/jwt");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Token missing",
        });
    }
    const token = authHeader.replace("Bearer ", "");
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = {
            id: payload.id,
            role: payload.role,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
}
