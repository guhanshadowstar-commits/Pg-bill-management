import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const READING_TYPES = ["checkin", "checkout", "month_end"];

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const month = searchParams.get("month");

  if (!roomId) return NextResponse.json({ error: "room_id is required" }, { status: 400 });

  let query = supabase
    .from("room_meter_readings")
    .select("*")
    .eq("owner_id", session.owner.owner_id)
    .eq("room_id", roomId)
    .order("reading_date", { ascending: true });

  if (month) {
    query = query.gte("reading_date", `${month}-01`).lte("reading_date", `${month}-31`);
  }

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
  const occupancy_log_id = body.occupancy_log_id ? String(body.occupancy_log_id).trim() : null;
  const reading_value = Number(body.reading_value);
  const reading_type = String(body.reading_type || "").trim();
  const reading_date = String(body.reading_date || "").trim();

  if (!room_id || !Number.isFinite(reading_value) || !READING_TYPES.includes(reading_type) || !reading_date) {
    return NextResponse.json(
      { error: "room_id, reading_value, valid reading_type and reading_date are required" },
      { status: 400 }
    );
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", room_id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (roomError || !room) return NextResponse.json({ error: "Room not found for this owner" }, { status: 404 });

  const { data, error } = await supabase
    .from("room_meter_readings")
    .insert({
      owner_id: session.owner.owner_id,
      room_id,
      occupancy_log_id,
      reading_value,
      reading_type,
      reading_date
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
