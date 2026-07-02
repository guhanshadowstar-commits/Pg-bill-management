import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("owner_id", session.owner.owner_id)
    .order("room_number", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
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
  const monthly_rent = body.monthly_rent !== undefined && body.monthly_rent !== null ? Number(body.monthly_rent) : null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("rooms")
    .insert({ owner_id: session.owner.owner_id, room_number: roomNumber, sharing_type: sharingType, meter_number, monthly_rent, status })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
