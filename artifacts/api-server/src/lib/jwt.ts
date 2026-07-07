import jwt from "jsonwebtoken";

if (!process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET must be set");
}

const SECRET = process.env["SESSION_SECRET"];
const EXPIRES_IN = "8h";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
