import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({ points: 60, duration: 60 }); // 60 req/min/IP

export async function rateLimit(req: any, res: any, next: any) {
  // Skip rate limiting for OPTIONS (CORS preflight) requests
  if (req.method === "OPTIONS") {
    return next();
  }
  
  const ip = String(req.ip || "");
  const isLocal = ip.includes("127.0.0.1") || ip.includes("::1") || ip.includes("localhost");
  if (process.env.NODE_ENV === "test" || process.env.BYPASS_RATE_LIMIT === "1" || isLocal) {
    return next();
  }
  try {
    await limiter.consume(ip);
    next();
  } catch {
    // Send CORS headers even when rate limiting
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.status(429).json({ error: "Too many requests" });
  }
}
