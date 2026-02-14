import fs from "fs-extra";
import lockfile from "proper-lockfile";
import path from "path";

const PASSWORD_PROFILE_PATH = path.join(process.cwd(), "..", "data", "auth-password-profiles.json");

type PasswordProfile = {
  userId: string;
  email: string;
  passwordSet: boolean;
  updatedAt: string;
};

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalizeEmail(email: string) {
  return safeText(email).toLowerCase();
}

async function ensureStore() {
  await fs.ensureDir(path.dirname(PASSWORD_PROFILE_PATH));
  if (!(await fs.pathExists(PASSWORD_PROFILE_PATH))) {
    await fs.writeJson(PASSWORD_PROFILE_PATH, [], { spaces: 2 });
  }
}

async function withLockedStore<T>(fn: (rows: PasswordProfile[]) => Promise<T>) {
  await ensureStore();
  const release = await lockfile.lock(PASSWORD_PROFILE_PATH, { retries: 5, stale: 10000 });
  try {
    const raw = await fs.readJson(PASSWORD_PROFILE_PATH).catch(() => []);
    const rows = Array.isArray(raw) ? raw : [];
    const out = await fn(rows);
    await fs.writeJson(PASSWORD_PROFILE_PATH, rows, { spaces: 2 });
    return out;
  } finally {
    await release();
  }
}

export async function markPasswordSet(input: { userId?: string; email?: string }) {
  const userId = safeText(input.userId);
  const email = normalizeEmail(input.email || "");
  if (!userId && !email) return;
  await withLockedStore(async (rows) => {
    const now = new Date().toISOString();
    const idx = rows.findIndex((x) =>
      (userId && safeText(x.userId) === userId) ||
      (email && normalizeEmail(x.email) === email)
    );
    const next: PasswordProfile = {
      userId: userId || safeText(rows[idx]?.userId),
      email: email || normalizeEmail(rows[idx]?.email || ""),
      passwordSet: true,
      updatedAt: now
    };
    if (idx >= 0) rows[idx] = { ...rows[idx], ...next };
    else rows.push(next);
  });
}

export async function hasPasswordSet(input: { userId?: string; email?: string }) {
  const userId = safeText(input.userId);
  const email = normalizeEmail(input.email || "");
  if (!userId && !email) return false;
  await ensureStore();
  const raw = await fs.readJson(PASSWORD_PROFILE_PATH).catch(() => []);
  const rows = Array.isArray(raw) ? raw : [];
  const hit = rows.find((x: any) =>
    (userId && safeText(x?.userId) === userId) ||
    (email && normalizeEmail(x?.email || "") === email)
  );
  return !!hit?.passwordSet;
}

