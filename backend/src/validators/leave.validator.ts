import { z } from "zod";

export const leaveSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  reason: z.string().min(5),
});