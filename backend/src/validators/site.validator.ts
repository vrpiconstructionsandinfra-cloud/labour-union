import { z } from "zod";

export const createSiteSchema = z.object({
  siteCode: z
    .string()
    .min(3, "Site code must be at least 3 characters")
    .max(20),

  siteName: z
    .string()
    .min(3, "Site name is required"),

  companyName: z
    .string()
    .min(3, "Company name is required"),

  address: z
    .string()
    .min(5, "Address is required"),

  city: z
    .string()
    .min(2),

  state: z
    .string()
    .min(2),

  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Invalid pincode"),

  contactPerson: z
    .string()
    .min(3),

  contactNumber: z
    .string()
    .regex(/^[0-9]{10}$/, "Invalid phone number"),

  status: z
    .string()
    .optional()
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;