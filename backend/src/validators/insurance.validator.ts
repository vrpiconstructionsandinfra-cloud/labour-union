import { z } from "zod";

const parseWorkerId = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const digits = val.replace(/\D/g, "");
    if (digits) return Number(digits);
    return Number(val);
  }
  return val;
}, z.number().positive());

const optionalTrimmedString = (minLen = 1) =>
  z.preprocess((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return val === null ? undefined : val;
  }, z.string().min(minLen).optional());

const optionalNumeric = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().positive().optional());

export const insuranceSchema = z.object({
  workerId: parseWorkerId,

  provider: optionalTrimmedString(2),

  policyNumber: optionalTrimmedString(2),

  coverageAmount: optionalNumeric,

  premiumAmount: optionalNumeric,

  startDate: optionalTrimmedString(1),

  endDate: optionalTrimmedString(1),

  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "PENDING", "CANCELLED"]).optional(),
});