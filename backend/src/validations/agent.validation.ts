import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(3),

  email: z.string().email(),

  password: z.string().min(6),

  phone: z.string().optional(),

  employeeCode: z.string().min(2),

  designation: z.string(),

  salary: z.number(),

  siteId: z.number().optional(),

  joiningDate: z.string().optional(),
});