import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("bill_splits")
    .select("id, amount, status, tenants(full_name, phone), electricity_bills(bill_month, rooms(room_number))")
    .eq("owner_id", session.owner.owner_id)
    .neq("status", "paid");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const pending = (data || []).map((s: any) => ({
    split_id: s.id,
    tenant_name: s.tenants?.full_name || "-",
    phone: s.tenants?.phone || null,
    room_number: s.electricity_bills?.rooms?.room_number || "-",
    bill_month: s.electricity_bills?.bill_month || null,
    amount_due: s.amount,
    status: s.status
  }));

  return NextResponse.json({ count: pending.length, pending });
}
