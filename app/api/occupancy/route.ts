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
      .from("occupancy_logs")
      .select("id, room_id, tenant_id, check_in, check_out, created_at, rooms(room_number), tenants(full_name)")
      .eq("owner_id", session.owner.owner_id)
      .order("check_in", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const db = await readDb();
  const rows = db.occupancy_logs
    .filter((row) => belongsToOwner(row, session.owner.owner_id))
    .map((o) => ({
      ...o,
      rooms: { room_number: db.rooms.find((r) => r.id === o.room_id && belongsToOwner(r, session.owner.owner_id))?.room_number || "-" },
      tenants: { full_name: db.tenants.find((t) => t.id === o.tenant_id && belongsToOwner(t, session.owner.owner_id))?.full_name || "-" }
    }))
    .sort((a, b) => b.check_in.localeCompare(a.check_in));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const body = await req.json();
  const room_id = String(body.room_id || "").trim();
  const tenant_id = String(body.tenant_id || "").trim();
  const check_in = String(body.check_in || "").trim();
  const check_out = body.check_out ? String(body.check_out).trim() : null;

  if (!room_id || !tenant_id || !check_in) {
    return NextResponse.json({ error: "room_id, tenant_id and check_in are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const [{ data: room }, { data: tenant }] = await Promise.all([
      supabase.from("rooms").select("id").eq("id", room_id).eq("owner_id", session.owner.owner_id).single(),
      supabase.from("tenants").select("id").eq("id", tenant_id).eq("owner_id", session.owner.owner_id).single()
    ]);

    if (!room || !tenant) {
      return NextResponse.json({ error: "Room or tenant not found for this owner" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("occupancy_logs")
      .insert({ owner_id: session.owner.owner_id, room_id, tenant_id, check_in, check_out })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

  const db = await readDb();
  const room = db.rooms.find((row) => row.id === room_id && belongsToOwner(row, session.owner.owner_id));
  const tenant = db.tenants.find((row) => row.id === tenant_id && belongsToOwner(row, session.owner.owner_id));

  if (!room || !tenant) {
    return NextResponse.json({ error: "Room or tenant not found for this owner" }, { status: 404 });
  }

  const row = {
    id: uid("occ"),
    owner_id: session.owner.owner_id,
    room_id,
    tenant_id,
    check_in,
    check_out,
    created_at: new Date().toISOString()
  };

  db.occupancy_logs.push(row);
  await writeDb(db);
  return NextResponse.json(row, { status: 201 });
}
