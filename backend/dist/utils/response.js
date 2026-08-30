"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, message, data) => {
    return res.status(200).json({
        success: true,
        message,
        data,
    });
};
exports.successResponse = successResponse;
const errorResponse = (res, status, message) => {
    return res.status(status).json({
        success: false,
        message,
    });
};
exports.errorResponse = errorResponse;
