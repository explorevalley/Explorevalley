import fs from "fs-extra";
import lockfile from "proper-lockfile";
import path from "path";
import { DatabaseSchema, type Database } from "@explorevalley/shared";

const DATA_PATH = path.join(process.cwd(), "..", "data", "data.json");
const BACKUP_DIR = path.join(process.cwd(), "..", "data", "backups");

function nowISO() { return new Date().toISOString(); }

export async function readData(): Promise<Database> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return DatabaseSchema.parse(parsed);
}

async function atomicWrite(filePath: string, content: string) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.move(tmp, filePath, { overwrite: true });
}

export async function mutateData(mutator: (db: Database) => void, backupLabel?: string) {
  await fs.ensureDir(path.dirname(DATA_PATH));
  await fs.ensureDir(BACKUP_DIR);

  const release = await lockfile.lock(DATA_PATH, { retries: 10, stale: 10000 });
  try {
    const db = await readData();
    if (backupLabel) {
      const stamp = nowISO().replace(/[:.]/g, "-");
      await atomicWrite(path.join(BACKUP_DIR, `${stamp}_${backupLabel}.json`), JSON.stringify(db, null, 2));
    }

    mutator(db);

    // validate before write
    const validated = DatabaseSchema.parse(db);
    await atomicWrite(DATA_PATH, JSON.stringify(validated, null, 2));
    return validated;
  } finally {
    await release();
  }
}
