import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("occupancy_logs")
      .select("id, room_id, tenant_id, check_in, check_out, created_at, rooms(room_number), tenants(full_name)")
      .order("check_in", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const db = await readDb();
  const rows = db.occupancy_logs
    .map((o) => ({
      ...o,
      rooms: { room_number: db.rooms.find((r) => r.id === o.room_id)?.room_number || "-" },
      tenants: { full_name: db.tenants.find((t) => t.id === o.tenant_id)?.full_name || "-" }
    }))
    .sort((a, b) => b.check_in.localeCompare(a.check_in));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
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
    const { data, error } = await supabase
      .from("occupancy_logs")
      .insert({ room_id, tenant_id, check_in, check_out })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

  const db = await readDb();
  const row = {
    id: uid("occ"),
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
