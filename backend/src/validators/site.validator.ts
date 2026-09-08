import { z } from "zod";

export const createSiteSchema = z.object({
  siteCode: z
    .string()
    .min(1, "Site code is required")
    .max(50)
    .optional()
    .or(z.literal("")),

  siteName: z
    .string()
    .min(1, "Site name is required"),

  companyName: z
    .string()
    .optional()
    .default("Labor Union Org"),

  address: z
    .string()
    .optional()
    .default("Site Location"),

  city: z
    .string()
    .optional()
    .default("Mumbai"),

  state: z
    .string()
    .optional()
    .default("Maharashtra"),

  pincode: z
    .string()
    .optional()
    .default("400001"),

  contactPerson: z
    .string()
    .optional()
    .default("Site Supervisor"),

  contactNumber: z
    .string()
    .optional()
    .default("9876543210"),

  status: z
    .string()
    .optional()
    .default("ACTIVE")
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;