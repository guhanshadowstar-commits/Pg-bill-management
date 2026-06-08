import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysInclusive(start: string, end: string | null) {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end || isoDate(new Date())}T00:00:00`);
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1);
}

export async function GET() {
  const today = isoDate(new Date());
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 3);
  const from = isoDate(fromDate);

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("occupancy_logs")
      .select("id, room_id, tenant_id, check_in, check_out, created_at, rooms(room_number), tenants(full_name, phone)")
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

  const db = await readDb();
  const rows = db.occupancy_logs
    .filter((row) => row.check_in <= today && (!row.check_out || row.check_out >= from))
    .sort((a, b) => b.check_in.localeCompare(a.check_in))
    .map((row) => ({
      ...row,
      days_stayed: daysInclusive(row.check_in, row.check_out),
      rooms: { room_number: db.rooms.find((room) => room.id === row.room_id)?.room_number || "-" },
      tenants: {
        full_name: db.tenants.find((tenant) => tenant.id === row.tenant_id)?.full_name || "-",
        phone: db.tenants.find((tenant) => tenant.id === row.tenant_id)?.phone || null
      }
    }));

  return NextResponse.json({
    from,
    to: today,
    total_records: rows.length,
    active_records: rows.filter((row) => !row.check_out).length,
    checked_out_records: rows.filter((row) => row.check_out).length,
    rows
  });
}
