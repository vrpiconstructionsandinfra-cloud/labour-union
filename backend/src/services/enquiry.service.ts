import prisma from "../config/prisma";
import { EnquiryDesignation, EnquiryStatus } from "@prisma/client";
import { createNotification } from "./notification.service";

export interface CreateEnquiryInput {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  designation?: 'WORKER' | 'AGENT';
}

/*
 * Create a new public enquiry from login page
 */
export async function createEnquiry(data: CreateEnquiryInput) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Full Name is required.");
  }
  const contactVal = (data.phone || (data as any).contact || '').trim();
  if (!contactVal) {
    throw new Error("Contact number is required.");
  }

  const designationEnum = data.designation === 'AGENT' ? EnquiryDesignation.AGENT : EnquiryDesignation.WORKER;

  let enquiry;
  try {
    enquiry = await (prisma.enquiry.create as any)({
      data: {
        name: data.name.trim(),
        email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
        phone: contactVal,
        address: data.address?.trim() || null,
        designation: designationEnum,
        status: EnquiryStatus.NEW,
      },
    });
  } catch (err: any) {
    try {
      enquiry = await (prisma.enquiry.create as any)({
        data: {
          name: data.name.trim(),
          email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
          contact: contactVal,
          address: data.address?.trim() || null,
          designation: designationEnum,
          status: EnquiryStatus.NEW,
        },
      });
    } catch {
      enquiry = await (prisma.enquiry.create as any)({
        data: {
          name: data.name.trim(),
          email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
          phone: contactVal,
          contact: contactVal,
          address: data.address?.trim() || null,
          designation: designationEnum,
          status: EnquiryStatus.NEW,
        },
      });
    }
  }

  // Notify Super Agents about the new enquiry
  createNotification({
    role: "SUPER_AGENT" as any,
    title: `New ${designationEnum} Enquiry: ${enquiry.name}`,
    message: `A new enquiry has been submitted by ${enquiry.name} (${contactVal}) for ${designationEnum} role.`,
    type: "ENQUIRY",
  }).catch(() => {});

  return enquiry;
}

/*
 * Get all enquiries (for Super Agent)
 */
export async function getAllEnquiries(filter?: { designation?: string; status?: string; search?: string }) {
  const where: any = {};

  if (filter?.designation && filter.designation !== 'ALL') {
    where.designation = filter.designation as EnquiryDesignation;
  }

  if (filter?.status && filter.status !== 'ALL') {
    where.status = filter.status as EnquiryStatus;
  }

  if (filter?.search && filter.search.trim()) {
    const term = filter.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/*
 * Update enquiry status / notes
 */
export async function updateEnquiryStatus(
  id: number,
  status: EnquiryStatus,
  notes?: string
) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id } });
  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  return prisma.enquiry.update({
    where: { id },
    data: {
      status,
      ...(notes !== undefined ? { notes } : {}),
    },
  });
}

/*
 * Delete an enquiry
 */
export async function deleteEnquiry(id: number) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id } });
  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  return prisma.enquiry.delete({
    where: { id },
  });
}
