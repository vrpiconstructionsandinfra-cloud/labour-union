"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const agent_controller_1 = require("../controllers/agent.controller");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/*
 Assign worker to agent

 POST /api/agents/assign
*/
router.post("/assign", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT), agent_controller_1.assignWorker);
/*
 Remove worker from agent

 DELETE /api/agents/remove/:workerId
*/
router.delete("/remove/:workerId", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT), agent_controller_1.removeWorker);
/*
 Get workers under agent

 GET /api/agents/:agentId/workers
*/
router.get("/:agentId/workers", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), agent_controller_1.workersByAgent);
/*
 Get worker assigned agent

 GET /api/agents/worker/:workerId
*/
router.get("/worker/:workerId", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), agent_controller_1.workerAgent);
exports.default = router;
