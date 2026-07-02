import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function generateApplySlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data: existing, error } = await supabase
    .from("owner_settings")
    .select("*")
    .eq("owner_id", session.owner.owner_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (existing) return NextResponse.json(existing);

  const { data: created, error: createError } = await supabase
    .from("owner_settings")
    .insert({ owner_id: session.owner.owner_id, vacancy_notice_days: 30, apply_slug: generateApplySlug() })
    .select("*")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json(created);
}

export async function PUT(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const updates: { vacancy_notice_days?: number; guest_policy_text?: string | null } = {};

  if (body.vacancy_notice_days !== undefined) {
    const days = Number(body.vacancy_notice_days);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return NextResponse.json({ error: "vacancy_notice_days must be a whole number between 0 and 365" }, { status: 400 });
    }
    updates.vacancy_notice_days = days;
  }

  if (body.guest_policy_text !== undefined) {
    const text = body.guest_policy_text === null ? "" : String(body.guest_policy_text);
    if (text.length > 5000) {
      return NextResponse.json({ error: "guest_policy_text must be under 5000 characters" }, { status: 400 });
    }
    updates.guest_policy_text = text.trim() || null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("owner_settings")
    .update(updates)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
