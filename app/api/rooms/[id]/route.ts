import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const { id } = await params;
  const body = await req.json();
  const { owner_id: _ownerId, id: _bodyId, created_at: _createdAt, ...safeBody } = body;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("rooms")
      .update(safeBody)
      .eq("id", id)
      .eq("owner_id", session.owner.owner_id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const db = await readDb();
  const idx = db.rooms.findIndex((r) => r.id === id && belongsToOwner(r, session.owner.owner_id));
  if (idx === -1) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  db.rooms[idx] = { ...db.rooms[idx], ...safeBody };
  await writeDb(db);
  return NextResponse.json(db.rooms[idx]);
}
