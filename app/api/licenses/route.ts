import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("owner_id", session.owner.owner_id)
    .order("expiry_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const body = await req.json();
  const license_name = String(body.license_name || "").trim().slice(0, 200);
  const expiry_date = String(body.expiry_date || "").trim();
  const notes = body.notes ? String(body.notes).slice(0, 2000) : null;

  if (!license_name || !expiry_date) {
    return NextResponse.json({ error: "license_name and expiry_date are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("licenses")
    .insert({ owner_id: session.owner.owner_id, license_name, expiry_date, notes })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
