"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignWorkerToAgent = assignWorkerToAgent;
exports.removeWorkerFromAgent = removeWorkerFromAgent;
exports.getAgentWorkers = getAgentWorkers;
exports.getWorkerAgent = getWorkerAgent;
const prisma_1 = __importDefault(require("../config/prisma"));
/*
 Assign worker to agent
*/
async function assignWorkerToAgent(workerId, agentId) {
    return prisma_1.default.user.update({
        where: {
            id: workerId,
        },
        data: {
            assignedAgentId: agentId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            assignedAgentId: true,
            employeeCode: true,
            designation: true,
            status: true,
            active: true,
        },
    });
}
/*
 Remove worker from agent
*/
async function removeWorkerFromAgent(workerId) {
    return prisma_1.default.user.update({
        where: {
            id: workerId
        },
        data: {
            assignedAgentId: null
        },
    });
}
/*
 Get workers under agent
*/
async function getAgentWorkers(agentId) {
    return prisma_1.default.user.findMany({
        where: {
            assignedAgentId: agentId
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            employeeCode: true,
            designation: true,
            site: true
        }
    });
}
/*
 Get worker's agent
*/
async function getWorkerAgent(workerId) {
    return prisma_1.default.user.findUnique({
        where: {
            id: workerId
        },
        select: {
            assignedAgent: true
        }
    });
}
