"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const siteAssignment_controller_1 = require("../controllers/siteAssignment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
/*
 Assign worker to site
*/
router.post("/assign", auth_middleware_1.authenticate, (0, role_middleware_1.authorize)("SUPER_AGENT"), siteAssignment_controller_1.assignWorker);
/*
 Remove worker from site
*/
router.patch("/remove/:workerId", auth_middleware_1.authenticate, (0, role_middleware_1.authorize)("SUPER_AGENT"), siteAssignment_controller_1.removeWorker);
/*
 Get all workers in a site
*/
router.get("/:siteId/workers", auth_middleware_1.authenticate, (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT"), siteAssignment_controller_1.getSiteWorkers);
/*
 Get a worker's assigned site
*/
router.get("/worker/:workerId", auth_middleware_1.authenticate, (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "WORKER"), siteAssignment_controller_1.getWorkerSite);
exports.default = router;
