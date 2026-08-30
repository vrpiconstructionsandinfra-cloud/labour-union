"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// ─── CORS: only allow the known frontend origin ───────────────────────────────
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use((0, cors_1.default)({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((0, cookie_parser_1.default)());
// ─── Security headers ─────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", allowedOrigin],
        },
    },
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)("dev"));
// ─── Rate limiting: login endpoint ────────────────────────────────────────────
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // max 50 login attempts per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
    },
});
app.use("/api/auth/login", loginLimiter);
// ─── General API rate limit ───────────────────────────────────────────────────
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000, // Increased threshold for rapid field testing & dashboard polling
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please slow down.",
    },
    skip: (req) => req.path.includes('/attendance') || req.path.includes('/users') || req.path.includes('/dashboard'),
});
app.use("/api", generalLimiter);
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Labour Union backend is healthy",
    });
});
app.use("/api", routes_1.default);
exports.default = app;
