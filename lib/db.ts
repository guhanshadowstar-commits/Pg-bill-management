import { promises as fs } from "fs";
import path from "path";
import type { DBShape } from "@/lib/types";

const dbPath = path.join(process.cwd(), "data", "db.json");
let writeQueue = Promise.resolve();

async function ensureDb() {
  try {
    await fs.access(dbPath);
  } catch {
    const initial: DBShape = {
      rooms: [],
      tenants: [],
      occupancy_logs: [],
      electricity_bills: [],
      bill_splits: [],
      payments: []
    };
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readDb(): Promise<DBShape> {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw) as DBShape;
}

export async function writeDb(next: DBShape): Promise<void> {
  await ensureDb();
  writeQueue = writeQueue.then(() => fs.writeFile(dbPath, JSON.stringify(next, null, 2), "utf8"));
  await writeQueue;
}
