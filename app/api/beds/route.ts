import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");

  let query = supabase
    .from("beds")
    .select("*, rooms(room_number)")
    .eq("owner_id", session.owner.owner_id)
    .order("bed_label", { ascending: true });

  if (roomId) query = query.eq("room_id", roomId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const room_id = String(body.room_id || "").trim();
  const bed_label = String(body.bed_label || "").trim();
  const status = ["vacant", "occupied", "reserved", "maintenance"].includes(body.status) ? body.status : "vacant";

  if (!room_id || !bed_label) {
    return NextResponse.json({ error: "room_id and bed_label are required" }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", room_id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (roomError || !room) return NextResponse.json({ error: "Room not found for this owner" }, { status: 404 });

  const { data, error } = await supabase
    .from("beds")
    .insert({ owner_id: session.owner.owner_id, room_id, bed_label, status })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
