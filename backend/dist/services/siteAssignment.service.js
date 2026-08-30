"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignWorkerToSite = assignWorkerToSite;
exports.removeWorkerFromSite = removeWorkerFromSite;
exports.getSiteWorkers = getSiteWorkers;
exports.getWorkerSite = getWorkerSite;
const prisma_1 = __importDefault(require("../config/prisma"));
/*
 Assign worker to site
*/
async function assignWorkerToSite(workerId, siteId) {
    const worker = await prisma_1.default.user.findUnique({
        where: {
            id: workerId,
        },
    });
    if (!worker) {
        throw new Error("Worker not found");
    }
    const site = await prisma_1.default.site.findUnique({
        where: {
            id: siteId,
        },
    });
    if (!site) {
        throw new Error("Site not found");
    }
    return prisma_1.default.user.update({
        where: {
            id: workerId,
        },
        data: {
            siteId,
        },
    });
}
/*
 Remove worker from site
*/
async function removeWorkerFromSite(workerId) {
    const worker = await prisma_1.default.user.findUnique({
        where: {
            id: workerId,
        },
    });
    if (!worker) {
        throw new Error("Worker not found");
    }
    return prisma_1.default.user.update({
        where: {
            id: workerId,
        },
        data: {
            siteId: null,
        },
    });
}
/*
 Get workers of a site
*/
async function getSiteWorkers(siteId) {
    return prisma_1.default.user.findMany({
        where: {
            siteId,
            role: "WORKER",
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            employeeCode: true,
            designation: true,
        },
    });
}
/*
 Get worker site
*/
async function getWorkerSite(workerId) {
    return prisma_1.default.user.findUnique({
        where: {
            id: workerId,
        },
        select: {
            site: true,
        },
    });
}
