import { Request, Response } from "express";
import * as siteService from "../services/site.service";
import { createSiteSchema } from "../validators/site.validator";

export const create = async (req: Request, res: Response) => {
  try {
    const body = createSiteSchema.parse(req.body);
    const user = (req as any).user;
    const site = await siteService.createSite(body, user.id);

    res.status(201).json({
      success: true,
      data: site
    });
  } catch (error: any) {
    if (error?.errors) {
      return res.status(400).json({
        success: false,
        message: error.errors.map((e: any) => e.message).join(", ")
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create working site"
    });
  }
};

export const findAll = async (req: Request, res: Response) => {
  try {
    const sites = await siteService.getAllSites();
    res.json({
      success: true,
      data: sites
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch sites"
    });
  }
};

export const findOne = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch site"
    });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const site = await siteService.updateSite(
      Number(req.params.id),
      req.body
    );
    res.json({
      success: true,
      data: site
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update site"
    });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await siteService.deleteSite(Number(req.params.id));
    res.json({
      success: true,
      message: "Site deleted"
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete site"
    });
  }
};