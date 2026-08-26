import { z } from "zod";

export const walletIdSchema = z.object({
  workerId: z.coerce.number().positive(),
});

export const walletTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
});