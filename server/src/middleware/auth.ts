import jwt from "jsonwebtoken";

export type AuthClaims = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  mode?: string;
  iat?: number;
  exp?: number;
};

function readBearerToken(req: any) {
  const auth = String(req.headers.authorization || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

export function getAuthClaims(req: any): AuthClaims | null {
  return ((req as any).auth || null) as AuthClaims | null;
}

export function requireAuth(req: any, res: any, next: any) {
  const token = readBearerToken(req);
  if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

  const secret = process.env.JWT_SECRET || "dev_jwt_secret";
  try {
    const decoded = jwt.verify(token, secret) as AuthClaims;
    if (!decoded?.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    (req as any).auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
