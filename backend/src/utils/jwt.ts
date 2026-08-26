import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "labor_union_secret";

/*
 * Generate JWT Token
 */
export function generateToken(
  id: number,
  role: string
) {
  return jwt.sign(
    {
      id,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

/*
 * Verify JWT Token
 */
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}