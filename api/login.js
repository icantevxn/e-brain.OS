import {
  createSessionCookie,
  clearSessionCookie,
  hasValidSession,
  isCorrectPassword,
} from "./_lib/auth.js";

/**
 * Exchange the password for a signed session cookie.
 *
 *   GET    → { authenticated }   cheap check so the app knows whether to show login
 *   POST   → { password }        sets the cookie, or 401
 *   DELETE → clears the cookie
 */
export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: hasValidSession(req) });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(200).json({ authenticated: false });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return res
      .status(500)
      .json({ error: "Server is missing APP_PASSWORD or SESSION_SECRET" });
  }

  if (!isCorrectPassword(req.body?.password)) {
    // Deliberately vague, and no hint about whether a password was even set.
    return res.status(401).json({ error: "Incorrect password" });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ authenticated: true });
}
