export function makeId(prefix: string) {
  // Avoid predictable IDs (timestamp + short random) to reduce enumeration risk.
  // Use Web Crypto if available (browser), else Node crypto.
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID().replace(/-/g, "")}`;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomUUID } = require("crypto") as { randomUUID: () => string };
    if (typeof randomUUID === "function") {
      return `${prefix}_${randomUUID().replace(/-/g, "")}`;
    }
  } catch {
    // ignore
  }
  // Last-resort fallback (older JS runtimes): still include more entropy than before.
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}
