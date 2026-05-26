import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.from("rooms").update(body).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const db = await readDb();
  const idx = db.rooms.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  db.rooms[idx] = { ...db.rooms[idx], ...body };
  await writeDb(db);
  return NextResponse.json(db.rooms[idx]);
}
