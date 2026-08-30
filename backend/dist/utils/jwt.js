"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "labor_union_secret";
/*
 * Generate JWT Token
 */
function generateToken(id, role) {
    return jsonwebtoken_1.default.sign({
        id,
        role,
    }, JWT_SECRET, {
        expiresIn: "7d",
    });
}
/*
 * Verify JWT Token
 */
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
