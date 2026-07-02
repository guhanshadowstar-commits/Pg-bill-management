import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const ownerId = session.owner.owner_id;
  const today = new Date();
  const soonCutoff = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [ebRes, rentRes, licenseRes, guestRes] = await Promise.all([
    supabase
      .from("bill_splits")
      .select("id, amount, status, tenants(full_name), electricity_bills(bill_month, rooms(room_number))")
      .eq("owner_id", ownerId)
      .neq("status", "paid"),
    supabase
      .from("rent_payments")
      .select("id, paid_amount, status, tenants(full_name), rent_charges(charge_month, per_tenant_amount, rooms(room_number))")
      .eq("owner_id", ownerId)
      .neq("status", "paid"),
    supabase
      .from("licenses")
      .select("id, license_name, expiry_date")
      .eq("owner_id", ownerId)
      .lte("expiry_date", soonCutoff)
      .order("expiry_date", { ascending: true }),
    supabase
      .from("guest_requests")
      .select("id, guest_name, start_date, end_date, tenants(full_name)")
      .eq("owner_id", ownerId)
      .eq("status", "pending")
  ]);

  const firstError = ebRes.error || rentRes.error || licenseRes.error || guestRes.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 400 });

  const todayStr = today.toISOString().slice(0, 10);

  const unpaidEb = (ebRes.data || []).map((s: any) => ({
    id: s.id,
    tenant_name: s.tenants?.full_name || "-",
    room_number: s.electricity_bills?.rooms?.room_number || "-",
    bill_month: s.electricity_bills?.bill_month || null,
    amount_due: Number(s.amount || 0),
    status: s.status
  }));

  const unpaidRent = (rentRes.data || []).map((p: any) => ({
    id: p.id,
    tenant_name: p.tenants?.full_name || "-",
    room_number: p.rent_charges?.rooms?.room_number || "-",
    charge_month: p.rent_charges?.charge_month || null,
    amount_due: Number((Number(p.rent_charges?.per_tenant_amount || 0) - Number(p.paid_amount || 0)).toFixed(2)),
    status: p.status
  }));

  const licensesDueSoon = (licenseRes.data || []).map((l: any) => ({
    id: l.id,
    license_name: l.license_name,
    expiry_date: l.expiry_date,
    days_left: Math.ceil((new Date(l.expiry_date).getTime() - new Date(todayStr).getTime()) / (24 * 60 * 60 * 1000))
  }));

  const pendingGuests = (guestRes.data || []).map((g: any) => ({
    id: g.id,
    guest_name: g.guest_name,
    tenant_name: g.tenants?.full_name || "-",
    start_date: g.start_date,
    end_date: g.end_date
  }));

  return NextResponse.json({ unpaidEb, unpaidRent, licensesDueSoon, pendingGuests });
}
