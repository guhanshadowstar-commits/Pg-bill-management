import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysInclusive(start: string, end: string | null) {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end || isoDate(new Date())}T00:00:00`);
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1);
}

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const today = isoDate(new Date());
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 3);
  const from = isoDate(fromDate);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("occupancy_logs")
    .select("id, room_id, tenant_id, check_in, check_out, created_at, rooms(room_number), tenants(full_name, phone)")
    .eq("owner_id", session.owner.owner_id)
    .lte("check_in", today)
    .or(`check_out.is.null,check_out.gte.${from}`)
    .order("check_in", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data || []).map((row: any) => ({
    ...row,
    days_stayed: daysInclusive(row.check_in, row.check_out)
  }));

  return NextResponse.json({
    from,
    to: today,
    total_records: rows.length,
    active_records: rows.filter((row: any) => !row.check_out).length,
    checked_out_records: rows.filter((row: any) => row.check_out).length,
    rows
  });
}
