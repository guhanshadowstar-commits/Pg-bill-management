import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { readDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const [roomsRes, tenantsRes, occupancyRes, pendingRes, revenueRes, recentBillsRes] = await Promise.all([
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("owner_id", session.owner.owner_id),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("owner_id", session.owner.owner_id),
      supabase
        .from("occupancy_logs")
        .select("tenant_id, check_in, check_out")
        .eq("owner_id", session.owner.owner_id),
      supabase.from("bill_splits").select("id", { count: "exact", head: true }).eq("owner_id", session.owner.owner_id).neq("status", "paid"),
      supabase.from("payments").select("paid_amount").eq("owner_id", session.owner.owner_id).gte("payment_date", monthStart),
      supabase
        .from("electricity_bills")
        .select("id, bill_month, total_amount, rooms(room_number)")
        .eq("owner_id", session.owner.owner_id)
        .order("bill_month", { ascending: false })
        .limit(5)
    ]);

    const occupancyRows = occupancyRes.data || [];
    const activeOccupancyTenants = new Set(
      occupancyRows
        .filter((row: any) => row.check_in <= today && (!row.check_out || row.check_out >= today))
        .map((row: any) => row.tenant_id)
    ).size;
    const activeTenants = occupancyRows.length > 0 ? activeOccupancyTenants : tenantsRes.count || 0;

    const monthlyRevenue = (revenueRes.data || []).reduce((sum: number, row: any) => sum + Number(row.paid_amount || 0), 0);

    return NextResponse.json({
      total_rooms: roomsRes.count || 0,
      active_tenants: activeTenants,
      pending_payments: pendingRes.count || 0,
      monthly_revenue: Number(monthlyRevenue.toFixed(2)),
      recent_bills: recentBillsRes.data || []
    });
  }

  const db = await readDb();
  const ownerTenants = db.tenants.filter((tenant) => belongsToOwner(tenant, session.owner.owner_id));
  const ownerOccupancyRows = db.occupancy_logs.filter((row) => belongsToOwner(row, session.owner.owner_id));
  const activeOccupancyTenants = new Set(
    ownerOccupancyRows
      .filter((row) => row.check_in <= today && (!row.check_out || row.check_out >= today))
      .map((row) => row.tenant_id)
  ).size;
  const monthlyRevenue = db.payments
    .filter((p) => p.payment_date >= monthStart && belongsToOwner(p, session.owner.owner_id))
    .reduce((sum, p) => sum + Number(p.paid_amount), 0);

  const recentBills = db.electricity_bills
    .filter((bill) => belongsToOwner(bill, session.owner.owner_id))
    .sort((a, b) => b.bill_month.localeCompare(a.bill_month))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      bill_month: b.bill_month,
      total_amount: b.total_amount,
      rooms: { room_number: db.rooms.find((r) => r.id === b.room_id && belongsToOwner(r, session.owner.owner_id))?.room_number || "-" }
    }));

  return NextResponse.json({
    total_rooms: db.rooms.filter((room) => belongsToOwner(room, session.owner.owner_id)).length,
    active_tenants: ownerOccupancyRows.length > 0 ? activeOccupancyTenants : ownerTenants.length,
    pending_payments: db.bill_splits.filter((s) => belongsToOwner(s, session.owner.owner_id) && s.status !== "paid").length,
    monthly_revenue: Number(monthlyRevenue.toFixed(2)),
    recent_bills: recentBills
  });
}
