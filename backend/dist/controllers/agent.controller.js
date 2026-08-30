"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignWorker = assignWorker;
exports.removeWorker = removeWorker;
exports.workersByAgent = workersByAgent;
exports.workerAgent = workerAgent;
const agent_service_1 = require("../services/agent.service");
/*
 Assign worker to agent
*/
async function assignWorker(req, res) {
    try {
        if (req.user?.role === "SUPER_AGENT") {
            return res.status(403).json({
                success: false,
                message: "Super Agents cannot modify worker assignments."
            });
        }
        const { workerId, agentId } = req.body;
        const targetAgentId = req.user?.role === "AGENT" ? req.user.id : Number(agentId);
        const worker = await (0, agent_service_1.assignWorkerToAgent)(Number(workerId), targetAgentId);
        res.json({
            success: true,
            message: "Worker assigned to agent successfully",
            data: worker
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
/*
 Remove worker from agent
*/
async function removeWorker(req, res) {
    try {
        if (req.user?.role === "SUPER_AGENT") {
            return res.status(403).json({
                success: false,
                message: "Super Agents cannot modify worker assignments."
            });
        }
        const workerId = Number(req.params.workerId);
        const worker = await (0, agent_service_1.removeWorkerFromAgent)(workerId);
        res.json({
            success: true,
            message: "Worker removed from agent",
            data: worker
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
/*
 Get workers under agent
*/
async function workersByAgent(req, res) {
    try {
        const agentId = Number(req.params.agentId);
        const workers = await (0, agent_service_1.getAgentWorkers)(agentId);
        res.json({
            success: true,
            data: workers
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
/*
 Get worker agent
*/
async function workerAgent(req, res) {
    try {
        const workerId = Number(req.params.workerId);
        const agent = await (0, agent_service_1.getWorkerAgent)(workerId);
        res.json({
            success: true,
            data: agent
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
