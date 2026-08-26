import { z } from "zod";

export const insuranceSchema = z.object({
  workerId: z.number().positive(),

  provider: z.string().min(2),

  policyNumber: z.string().min(3),

  coverageAmount: z.number().positive(),

  premiumAmount: z.number().positive(),

  startDate: z.string(),

  endDate: z.string(),
});