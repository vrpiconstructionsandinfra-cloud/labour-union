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
exports.remove = exports.update = exports.findOne = exports.findAll = exports.create = void 0;
const siteService = __importStar(require("../services/site.service"));
const site_validator_1 = require("../validators/site.validator");
const create = async (req, res) => {
    const body = site_validator_1.createSiteSchema.parse(req.body);
    const user = req.user;
    const site = await siteService.createSite(body, user.id);
    res.status(201).json({
        success: true,
        data: site
    });
};
exports.create = create;
const findAll = async (req, res) => {
    const sites = await siteService.getAllSites();
    res.json({
        success: true,
        data: sites
    });
};
exports.findAll = findAll;
const findOne = async (req, res) => {
    const site = await siteService.getSiteById(Number(req.params.id));
    if (!site) {
        return res.status(404).json({
            success: false,
            message: "Site not found"
        });
    }
    res.json({
        success: true,
        data: site
    });
};
exports.findOne = findOne;
const update = async (req, res) => {
    const site = await siteService.updateSite(Number(req.params.id), req.body);
    res.json({
        success: true,
        data: site
    });
};
exports.update = update;
const remove = async (req, res) => {
    await siteService.deleteSite(Number(req.params.id));
    res.json({
        success: true,
        message: "Site deleted"
    });
};
exports.remove = remove;
