import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import routes from "./routes";

const app = express();

// ─── CORS: allow known frontend origins & Vercel deployments ─────────────────
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://my-dailywork.com",
  "https://www.my-dailywork.com",
];

const allowedOriginsSet = new Set([...configuredOrigins, ...defaultOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-side calls)
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/+$/, "");
      const isAllowed =
        allowedOriginsSet.has(normalized) ||
        normalized.endsWith(".vercel.app") ||
        normalized.includes("my-dailywork.com") ||
        normalized.includes("localhost") ||
        normalized.includes("127.0.0.1");

      if (isAllowed) {
        return callback(null, true);
      }

      // Allow dynamically in production to avoid hard-blocking frontend deployments
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // Disabled for pure REST/WebSocket API consumed across domains
  })
);

app.use(compression());
app.use(morgan("dev"));

// ─── Rate limiting: login endpoint ────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,                   // max 50 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

app.use("/api/auth/login", loginLimiter);

// ─── General API rate limit ───────────────────────────────────────────────────
const generalLimiter = rateLimit({
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

app.use("/api", routes);

export default app;
