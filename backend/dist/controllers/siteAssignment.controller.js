"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignWorker = assignWorker;
exports.removeWorker = removeWorker;
exports.getSiteWorkers = getSiteWorkers;
exports.getWorkerSite = getWorkerSite;
const siteAssignmentService = __importStar(require("../services/siteAssignment.service"));
/*
 Assign worker to site
*/
async function assignWorker(req, res) {
    try {
        const { workerId, siteId } = req.body;
        const result = await siteAssignmentService.assignWorkerToSite(Number(workerId), Number(siteId));
        res.json({
            success: true,
            message: "Worker assigned to site",
            data: result,
        });
    }
    catch (error) {
        console.error("Assign Worker Error:");
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: error,
        });
    }
}
/*
 Remove worker from site
*/
async function removeWorker(req, res) {
    try {
        const result = await siteAssignmentService.removeWorkerFromSite(Number(req.params.workerId));
        res.json({
            success: true,
            message: "Worker removed from site",
            data: result,
        });
    }
    catch (error) {
        console.error("Remove Worker Error:");
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: error,
        });
    }
}
/*
 Get workers in a site
*/
async function getSiteWorkers(req, res) {
    try {
        const workers = await siteAssignmentService.getSiteWorkers(Number(req.params.siteId));
        res.json({
            success: true,
            data: workers,
        });
    }
    catch (error) {
        console.error("Get Site Workers Error:");
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: error,
        });
    }
}
/*
 Get worker site
*/
async function getWorkerSite(req, res) {
    try {
        const site = await siteAssignmentService.getWorkerSite(Number(req.params.workerId));
        res.json({
            success: true,
            data: site,
        });
    }
    catch (error) {
        console.error("Get Worker Site Error:");
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: error,
        });
    }
}
