import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("guest_requests")
    .select("*, tenants(full_name)")
    .eq("owner_id", session.owner.owner_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const body = await req.json();
  const tenant_id = String(body.tenant_id || "").trim();
  const guest_name = String(body.guest_name || "").trim().slice(0, 200);
  const guest_phone = body.guest_phone ? String(body.guest_phone).slice(0, 30) : null;
  const start_date = String(body.start_date || "").trim();
  const end_date = String(body.end_date || "").trim();
  const notes = body.notes ? String(body.notes).slice(0, 2000) : null;

  if (!tenant_id || !guest_name || !start_date || !end_date) {
    return NextResponse.json({ error: "tenant_id, guest_name, start_date and end_date are required" }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: "end_date must be on or after start_date" }, { status: 400 });
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenant_id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (tenantError || !tenant) return NextResponse.json({ error: "Tenant not found for this owner" }, { status: 404 });

  const { data, error } = await supabase
    .from("guest_requests")
    .insert({
      owner_id: session.owner.owner_id,
      tenant_id,
      guest_name,
      guest_phone,
      start_date,
      end_date,
      notes,
      status: "pending"
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
