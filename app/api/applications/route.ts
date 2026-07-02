import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_TEXT_LENGTH = 500;

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const text = String(value ?? "").trim();
  return text.slice(0, maxLength) || null;
}

// PUBLIC when called with ?slug=X&rooms=1 (minimal room list for the apply form).
// Owner-scoped otherwise (list this owner's applications).
export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug && searchParams.get("rooms") === "1") {
    const { data: settings, error: settingsError } = await supabase
      .from("owner_settings")
      .select("owner_id")
      .eq("apply_slug", slug)
      .maybeSingle();

    if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });
    if (!settings) return NextResponse.json({ error: "Application link not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("rooms")
      .select("id, room_number")
      .eq("owner_id", settings.owner_id)
      .eq("status", "active")
      .order("room_number", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const session = await requireOwner(req);
  if (session.error) return session.error;

  const { data, error } = await supabase
    .from("tenant_applications")
    .select("*, rooms:desired_room_id(room_number)")
    .eq("owner_id", session.owner.owner_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

// PUBLIC: prospective tenants submit applications through the owner's apply link.
export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const slug = String(body.slug || "").trim();
  const full_name = cleanText(body.full_name, 120);

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!full_name) return NextResponse.json({ error: "full_name is required" }, { status: 400 });

  const desired_check_in = body.desired_check_in ? String(body.desired_check_in).trim() : null;
  if (desired_check_in && !isDateOnly(desired_check_in)) {
    return NextResponse.json({ error: "desired_check_in must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("owner_settings")
    .select("owner_id")
    .eq("apply_slug", slug)
    .maybeSingle();

  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });
  if (!settings) return NextResponse.json({ error: "Application link not found" }, { status: 404 });

  let desired_room_id: string | null = null;
  if (body.desired_room_id) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", String(body.desired_room_id))
      .eq("owner_id", settings.owner_id)
      .maybeSingle();
    desired_room_id = room?.id || null;
  }

  const { data, error } = await supabase
    .from("tenant_applications")
    .insert({
      owner_id: settings.owner_id,
      full_name,
      phone: cleanText(body.phone, 30),
      email: cleanText(body.email, 200),
      desired_room_id,
      desired_check_in,
      id_proof: cleanText(body.id_proof),
      notes: cleanText(body.notes, 1000),
      status: "pending"
    })
    .select("id, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
