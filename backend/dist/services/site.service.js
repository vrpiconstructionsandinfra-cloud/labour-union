"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSite = exports.updateSite = exports.getSiteById = exports.getAllSites = exports.createSite = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const notification_service_1 = require("./notification.service");
const createSite = async (data, createdById) => {
    const exists = await prisma_1.default.site.findUnique({
        where: {
            siteCode: data.siteCode
        }
    });
    if (exists) {
        throw new Error("Site code already exists");
    }
    return prisma_1.default.site.create({
        data: {
            ...data,
            createdById
        }
    });
};
exports.createSite = createSite;
const getAllSites = async () => {
    return prisma_1.default.site.findMany({
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            users: {
                select: {
                    id: true,
                    name: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
};
exports.getAllSites = getAllSites;
const getSiteById = async (id) => {
    return prisma_1.default.site.findUnique({
        where: {
            id
        },
        include: {
            users: true,
            createdBy: true
        }
    });
};
exports.getSiteById = getSiteById;
const updateSite = async (id, data) => {
    const existingSite = await prisma_1.default.site.findUnique({ where: { id } });
    const updatedSite = await prisma_1.default.site.update({
        where: { id },
        data
    });
    if (existingSite && data.status && existingSite.status !== data.status) {
        (0, notification_service_1.createNotification)({
            role: "SUPER_AGENT",
            title: "Site Status Changed",
            message: `Site "${updatedSite.siteName}" (${updatedSite.siteCode}) status changed from "${existingSite.status || 'ACTIVE'}" to "${data.status}".`,
            type: "SITE"
        }).catch(() => { });
    }
    return updatedSite;
};
exports.updateSite = updateSite;
const deleteSite = async (id) => {
    return prisma_1.default.site.delete({
        where: {
            id
        }
    });
};
exports.deleteSite = deleteSite;
