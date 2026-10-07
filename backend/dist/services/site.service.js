"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSite = exports.assignAdminToSite = exports.updateSite = exports.getSiteById = exports.getAllSites = exports.createSite = void 0;
exports.invalidateSiteCache = invalidateSiteCache;
const prisma_1 = __importDefault(require("../config/prisma"));
const notification_service_1 = require("./notification.service");
const cache_1 = require("../utils/cache");
function invalidateSiteCache() {
    cache_1.memoryCache.delPrefix("sites_");
    cache_1.memoryCache.delPrefix("dashboard_");
}
const createSite = async (data, createdById) => {
    let siteCode = data.siteCode?.trim() || `SITE-${Date.now().toString().slice(-4)}`;
    const exists = await prisma_1.default.site.findUnique({
        where: {
            siteCode
        }
    });
    if (exists) {
        siteCode = `SITE-${Date.now().toString().slice(-6)}`;
    }
    const newSite = await prisma_1.default.site.create({
        data: {
            ...data,
            siteCode,
            createdById
        }
    });
    invalidateSiteCache();
    return newSite;
};
exports.createSite = createSite;
const getAllSites = async () => {
    const cacheKey = "sites_all";
    const cached = cache_1.memoryCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const sites = await prisma_1.default.site.findMany({
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    employeeCode: true,
                    designation: true,
                    phone: true
                }
            },
            users: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                    employeeCode: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    cache_1.memoryCache.set(cacheKey, sites, 30);
    return sites;
};
exports.getAllSites = getAllSites;
const getSiteById = async (id) => {
    return prisma_1.default.site.findUnique({
        where: {
            id
        },
        include: {
            users: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    employeeCode: true,
                    designation: true,
                    phone: true
                }
            }
        }
    });
};
exports.getSiteById = getSiteById;
const updateSite = async (id, data) => {
    const existingSite = await prisma_1.default.site.findUnique({
        where: { id },
        include: { createdBy: true }
    });
    if (!existingSite) {
        throw new Error("Working site not found");
    }
    const updateData = {};
    if (data.siteName !== undefined)
        updateData.siteName = data.siteName;
    if (data.siteCode !== undefined)
        updateData.siteCode = data.siteCode;
    if (data.companyName !== undefined)
        updateData.companyName = data.companyName;
    if (data.address !== undefined)
        updateData.address = data.address;
    if (data.city !== undefined)
        updateData.city = data.city;
    if (data.state !== undefined)
        updateData.state = data.state;
    if (data.pincode !== undefined)
        updateData.pincode = data.pincode;
    if (data.contactPerson !== undefined)
        updateData.contactPerson = data.contactPerson;
    if (data.contactNumber !== undefined)
        updateData.contactNumber = data.contactNumber;
    if (data.status !== undefined)
        updateData.status = data.status;
    if (data.active !== undefined)
        updateData.active = Boolean(data.active);
    // Assign to Admin (via adminId or createdById)
    const rawAdminId = data.adminId !== undefined ? data.adminId : data.createdById;
    if (rawAdminId !== undefined) {
        const targetAdminId = Number(rawAdminId);
        if (!isNaN(targetAdminId) && targetAdminId > 0) {
            const targetUser = await prisma_1.default.user.findUnique({ where: { id: targetAdminId } });
            if (targetUser) {
                updateData.createdById = targetAdminId;
            }
        }
    }
    const updatedSite = await prisma_1.default.site.update({
        where: { id },
        data: updateData,
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    employeeCode: true,
                    designation: true,
                    phone: true
                }
            },
            users: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                    employeeCode: true
                }
            }
        }
    });
    if (existingSite && data.status && existingSite.status !== data.status) {
        (0, notification_service_1.createNotification)({
            role: "SUPER_AGENT",
            title: "Site Status Changed",
            message: `Site "${updatedSite.siteName}" (${updatedSite.siteCode}) status changed from "${existingSite.status || 'ACTIVE'}" to "${data.status}".`,
            type: "SITE"
        }).catch(() => { });
    }
    if (updateData.createdById && updateData.createdById !== existingSite.createdById) {
        (0, notification_service_1.createNotification)({
            userId: updateData.createdById,
            title: "Working Site Assigned",
            message: `Working Site "${updatedSite.siteName}" (${updatedSite.siteCode}) has been assigned to your supervision.`,
            type: "SITE"
        }).catch(() => { });
    }
    cache_1.memoryCache.delPrefix("admins_");
    invalidateSiteCache();
    return updatedSite;
};
exports.updateSite = updateSite;
const assignAdminToSite = async (siteId, adminId) => {
    return (0, exports.updateSite)(siteId, { adminId });
};
exports.assignAdminToSite = assignAdminToSite;
const deleteSite = async (id) => {
    const existingSite = await prisma_1.default.site.findUnique({ where: { id } });
    if (!existingSite) {
        throw new Error("Working site not found");
    }
    const result = await prisma_1.default.$transaction(async (tx) => {
        // 1. Unlink workers/users assigned to this site
        await tx.user.updateMany({
            where: { siteId: id },
            data: { siteId: null }
        });
        // 2. Unlink attendance records linked to this site
        await tx.attendance.updateMany({
            where: { siteId: id },
            data: { siteId: null }
        });
        // 3. Delete site assignments
        await tx.siteAssignment.deleteMany({
            where: { siteId: id }
        });
        // 4. Delete site payments
        await tx.sitePayment.deleteMany({
            where: { siteId: id }
        });
        // 5. Delete the site
        return tx.site.delete({
            where: { id }
        });
    });
    (0, notification_service_1.createNotification)({
        role: "SUPER_AGENT",
        title: "Working Site Deleted",
        message: `Site "${existingSite.siteName}" (${existingSite.siteCode}) has been deleted.`,
        type: "SITE"
    }).catch(() => { });
    invalidateSiteCache();
    return result;
};
exports.deleteSite = deleteSite;
