import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

/** Resolve the authenticated user from either a JWT Bearer token or a session cookie. */
function resolveAuth(req: Request): { userId: string; role: string } | null {
  // 1. JWT Bearer token (preferred — works everywhere including iframe contexts)
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload;
  }

  // 2. Fall back to session cookie
  if (req.session?.userId) {
    return { userId: req.session.userId, role: req.session.role };
  }

  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = resolveAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Normalise: ensure session fields are set so downstream handlers can read them
  req.session.userId = auth.userId;
  req.session.role = auth.role;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = resolveAuth(req);
    if (!auth) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.session.userId = auth.userId;
    req.session.role = auth.role;
    next();
  };
}
