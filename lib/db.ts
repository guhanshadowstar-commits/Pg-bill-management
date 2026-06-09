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
      owner_accounts: [],
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
  const parsed = JSON.parse(raw) as Partial<DBShape>;

  return {
    owner_accounts: parsed.owner_accounts || [],
    rooms: parsed.rooms || [],
    tenants: parsed.tenants || [],
    occupancy_logs: parsed.occupancy_logs || [],
    electricity_bills: parsed.electricity_bills || [],
    bill_splits: parsed.bill_splits || [],
    payments: parsed.payments || []
  };
}

export async function writeDb(next: DBShape): Promise<void> {
  await ensureDb();
  writeQueue = writeQueue.then(() => fs.writeFile(dbPath, JSON.stringify(next, null, 2), "utf8"));
  await writeQueue;
}
