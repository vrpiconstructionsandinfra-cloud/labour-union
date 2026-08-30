import { Request, Response } from "express";
import * as enquiryService from "../services/enquiry.service";
import { EnquiryStatus } from "@prisma/client";

/*
 * Public endpoint: Submit new enquiry
 */
export async function submitEnquiry(req: Request, res: Response) {
  try {
    const { name, email, phone, address, designation } = req.body;

    const enquiry = await enquiryService.createEnquiry({
      name,
      email,
      phone,
      address,
      designation,
    });

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully. Our team will contact you soon.",
      data: enquiry,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to submit enquiry",
    });
  }
}

/*
 * Super Agent endpoint: List all enquiries with search/filtering
 */
export async function getEnquiries(req: Request, res: Response) {
  try {
    const { designation, status, search } = req.query;

    const enquiries = await enquiryService.getAllEnquiries({
      designation: designation as string,
      status: status as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: enquiries,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enquiries",
    });
  }
}

/*
 * Super Agent endpoint: Update status / notes of an enquiry
 */
export async function updateStatus(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body;

    if (!status || !Object.values(EnquiryStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry status",
      });
    }

    const updated = await enquiryService.updateEnquiryStatus(id, status, notes);

    res.json({
      success: true,
      message: "Enquiry status updated successfully",
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update enquiry status",
    });
  }
}

/*
 * Super Agent endpoint: Delete enquiry
 */
export async function removeEnquiry(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await enquiryService.deleteEnquiry(id);

    res.json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete enquiry",
    });
  }
}
