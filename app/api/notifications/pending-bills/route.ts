import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("bill_splits")
      .select("id, amount, status, tenants(full_name, phone), electricity_bills(bill_month, rooms(room_number))")
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

  const db = await readDb();
  const pending = db.bill_splits
    .filter((s) => s.status !== "paid")
    .map((s) => {
      const bill = db.electricity_bills.find((b) => b.id === s.bill_id);
      const room = bill ? db.rooms.find((r) => r.id === bill.room_id) : null;
      const tenant = db.tenants.find((t) => t.id === s.tenant_id);
      return {
        split_id: s.id,
        tenant_name: tenant?.full_name || "-",
        phone: tenant?.phone || null,
        room_number: room?.room_number || "-",
        bill_month: bill?.bill_month || null,
        amount_due: s.amount,
        status: s.status
      };
    });

  return NextResponse.json({ count: pending.length, pending });
}
