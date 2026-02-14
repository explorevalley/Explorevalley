import SCREENS from "../data/screens.json";

function getPath(obj: any, path: string) {
  const parts = String(path || "").split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

export function uiText(screen: string, key: string, fallback = ""): string {
  const v = getPath(SCREENS as any, `${screen}.${key}`);
  return typeof v === "string" ? v : fallback;
}

export function uiBool(screen: string, key: string, fallback = false): boolean {
  const v = getPath(SCREENS as any, `${screen}.${key}`);
  return typeof v === "boolean" ? v : fallback;
}

export function uiList<T = any>(screen: string, key: string, fallback: T[] = []): T[] {
  const v = getPath(SCREENS as any, `${screen}.${key}`);
  return Array.isArray(v) ? v : fallback;
}

export function uiObj<T extends Record<string, any>>(screen: string, key: string, fallback: T): T {
  const v = getPath(SCREENS as any, `${screen}.${key}`);
  return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : fallback;
}

