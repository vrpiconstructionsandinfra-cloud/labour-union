import { Request, Response } from "express";
import * as siteAssignmentService from "../services/siteAssignment.service";

/*
 Assign worker to site
*/
export async function assignWorker(
  req: Request,
  res: Response
) {
  try {
    const { workerId, siteId } = req.body;

    const result =
      await siteAssignmentService.assignWorkerToSite(
        Number(workerId),
        Number(siteId)
      );

    res.json({
      success: true,
      message: "Worker assigned to site",
      data: result,
    });
  } catch (error: any) {
    console.error("Assign Worker Error:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
}

/*
 Remove worker from site
*/
export async function removeWorker(
  req: Request,
  res: Response
) {
  try {
    const result =
      await siteAssignmentService.removeWorkerFromSite(
        Number(req.params.workerId)
      );

    res.json({
      success: true,
      message: "Worker removed from site",
      data: result,
    });
  } catch (error: any) {
    console.error("Remove Worker Error:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
}

/*
 Get workers in a site
*/
export async function getSiteWorkers(
  req: Request,
  res: Response
) {
  try {
    const workers =
      await siteAssignmentService.getSiteWorkers(
        Number(req.params.siteId)
      );

    res.json({
      success: true,
      data: workers,
    });
  } catch (error: any) {
    console.error("Get Site Workers Error:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
}

/*
 Get worker site
*/
export async function getWorkerSite(
  req: Request,
  res: Response
) {
  try {
    const site =
      await siteAssignmentService.getWorkerSite(
        Number(req.params.workerId)
      );

    res.json({
      success: true,
      data: site,
    });
  } catch (error: any) {
    console.error("Get Worker Site Error:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
}