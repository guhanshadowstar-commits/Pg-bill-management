import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(from: string, to: string) {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor(ms / 86_400_000);
}

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("vacancy_requests")
    .select("*, tenants(full_name), occupancy_logs(check_in, rooms(room_number))")
    .eq("owner_id", session.owner.owner_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const tenant_id = String(body.tenant_id || "").trim();
  const occupancy_log_id = String(body.occupancy_log_id || "").trim();
  const requested_vacate_date = String(body.requested_vacate_date || "").trim();
  const notice_given_date = body.notice_given_date
    ? String(body.notice_given_date).trim()
    : new Date().toISOString().slice(0, 10);

  if (!tenant_id || !occupancy_log_id || !requested_vacate_date) {
    return NextResponse.json({ error: "tenant_id, occupancy_log_id and requested_vacate_date are required" }, { status: 400 });
  }

  if (!isDateOnly(requested_vacate_date) || !isDateOnly(notice_given_date)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
  }

  const [{ data: tenant }, { data: log }] = await Promise.all([
    supabase.from("tenants").select("id").eq("id", tenant_id).eq("owner_id", session.owner.owner_id).single(),
    supabase
      .from("occupancy_logs")
      .select("id, tenant_id")
      .eq("id", occupancy_log_id)
      .eq("owner_id", session.owner.owner_id)
      .single()
  ]);

  if (!tenant) return NextResponse.json({ error: "Tenant not found for this owner" }, { status: 404 });
  if (!log || log.tenant_id !== tenant_id) {
    return NextResponse.json({ error: "Occupancy log not found for this tenant" }, { status: 404 });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("owner_settings")
    .select("vacancy_notice_days")
    .eq("owner_id", session.owner.owner_id)
    .maybeSingle();

  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });

  const notice_days_required = settings?.vacancy_notice_days ?? 30;
  const advance_refund_eligible = daysBetween(notice_given_date, requested_vacate_date) >= notice_days_required;

  const { data, error } = await supabase
    .from("vacancy_requests")
    .insert({
      owner_id: session.owner.owner_id,
      tenant_id,
      occupancy_log_id,
      requested_vacate_date,
      notice_given_date,
      notice_days_required,
      advance_refund_eligible,
      status: "pending"
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
