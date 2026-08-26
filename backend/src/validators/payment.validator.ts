import { z } from "zod";

export const paymentSchema = z.object({
  workerId: z.number(),
  weekStart: z.string().datetime(),
  weekEnd: z.string().datetime(),

  basicAmount: z.number().positive(),

  overtimeAmount: z.number().default(0),

  bonus: z.number().default(0),

  deduction: z.number().default(0),

  insuranceDeduction: z.number().default(0),
});