import { NextResponse } from "next/server";
import { getOwnerSessionFromRequest, type OwnerSession } from "@/lib/owner-auth";

export async function requireOwner(req: Request): Promise<{ owner: OwnerSession; error?: never } | { owner?: never; error: NextResponse }> {
  const owner = await getOwnerSessionFromRequest(req);
  if (!owner) {
    return { error: NextResponse.json({ error: "Owner login required" }, { status: 401 }) };
  }

  return { owner };
}

export function belongsToOwner(row: { owner_id?: string | null }, ownerId: string) {
  return (row.owner_id || "owner") === ownerId;
}
