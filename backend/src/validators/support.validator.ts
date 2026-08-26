import { z } from "zod";

export const supportSchema = z.object({
  subject: z.string().min(3),

  description: z.string().min(10),

  priority: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
  ]),
});