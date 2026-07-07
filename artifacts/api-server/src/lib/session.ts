import session from "express-session";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

// On Replit (REPL_ID is always set), the app is served through an HTTPS proxy
// and the preview pane is an iframe on replit.com (cross-site). Browsers require
// SameSite=None; Secure for cookies to be sent in cross-site iframe contexts.
const onReplit = Boolean(process.env["REPL_ID"]);

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: onReplit || process.env.NODE_ENV === "production",
    sameSite: onReplit ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});
