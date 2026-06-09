import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("owner_id", session.owner.owner_id)
      .order("room_number", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const db = await readDb();
  const rows = db.rooms
    .filter((row) => belongsToOwner(row, session.owner.owner_id))
    .sort((a, b) => a.room_number.localeCompare(b.room_number));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const body = await req.json();
  const roomNumber = String(body.room_number || "").trim();
  const sharingType = Number(body.sharing_type || 0);

  if (!roomNumber || !Number.isFinite(sharingType) || sharingType <= 0) {
    return NextResponse.json({ error: "room_number and valid sharing_type are required" }, { status: 400 });
  }

  const status: "active" | "inactive" = body.status === "inactive" ? "inactive" : "active";
  const meter_number = body.meter_number || null;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({ owner_id: session.owner.owner_id, room_number: roomNumber, sharing_type: sharingType, meter_number, status })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

  const db = await readDb();
  if (db.rooms.some((r) => belongsToOwner(r, session.owner.owner_id) && r.room_number === roomNumber)) {
    return NextResponse.json({ error: "Room number already exists" }, { status: 400 });
  }

  const row = {
    id: uid("room"),
    owner_id: session.owner.owner_id,
    room_number: roomNumber,
    sharing_type: sharingType,
    meter_number,
    status,
    created_at: new Date().toISOString()
  };

  db.rooms.push(row);
  await writeDb(db);
  return NextResponse.json(row, { status: 201 });
}
