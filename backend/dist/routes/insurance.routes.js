"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insurance_controller_1 = require("../controllers/insurance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/*
 * Super Agent
 */
router.post("/", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT"), insurance_controller_1.createInsurance);
router.get("/", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "WORKER"), insurance_controller_1.getAllInsurance);
/*
 * Worker
 */
router.get("/my", (0, role_middleware_1.authorize)("WORKER"), insurance_controller_1.getMyInsurance);
/*
 * Super Agent
 */
router.get("/:workerId", (0, role_middleware_1.authorize)("SUPER_AGENT"), insurance_controller_1.getWorkerInsurance);
router.patch("/:id", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT"), insurance_controller_1.updateInsurance);
router.delete("/:id", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT"), insurance_controller_1.deleteInsurance);
exports.default = router;
