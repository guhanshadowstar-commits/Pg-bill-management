import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { readDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const [roomsRes, tenantsRes, pendingRes, revenueRes, recentBillsRes] = await Promise.all([
      supabase.from("rooms").select("id", { count: "exact", head: true }),
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("bill_splits").select("id", { count: "exact", head: true }).neq("status", "paid"),
      supabase.from("payments").select("paid_amount").gte("payment_date", monthStart),
      supabase
        .from("electricity_bills")
        .select("id, bill_month, total_amount, rooms(room_number)")
        .order("bill_month", { ascending: false })
        .limit(5)
    ]);

    const monthlyRevenue = (revenueRes.data || []).reduce((sum: number, row: any) => sum + Number(row.paid_amount || 0), 0);

    return NextResponse.json({
      total_rooms: roomsRes.count || 0,
      active_tenants: tenantsRes.count || 0,
      pending_payments: pendingRes.count || 0,
      monthly_revenue: Number(monthlyRevenue.toFixed(2)),
      recent_bills: recentBillsRes.data || []
    });
  }

  const db = await readDb();
  const monthlyRevenue = db.payments
    .filter((p) => p.payment_date >= monthStart)
    .reduce((sum, p) => sum + Number(p.paid_amount), 0);

  const recentBills = [...db.electricity_bills]
    .sort((a, b) => b.bill_month.localeCompare(a.bill_month))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      bill_month: b.bill_month,
      total_amount: b.total_amount,
      rooms: { room_number: db.rooms.find((r) => r.id === b.room_id)?.room_number || "-" }
    }));

  return NextResponse.json({
    total_rooms: db.rooms.length,
    active_tenants: db.tenants.length,
    pending_payments: db.bill_splits.filter((s) => s.status !== "paid").length,
    monthly_revenue: Number(monthlyRevenue.toFixed(2)),
    recent_bills: recentBills
  });
}
