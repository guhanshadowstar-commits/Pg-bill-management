import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  {
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
}
