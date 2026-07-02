import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function markRentPayment(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const rentPaymentId = String(body.rentPaymentId || "").trim();
  const paidAmount = Number(body.paidAmount);

  if (!rentPaymentId || !Number.isFinite(paidAmount) || paidAmount <= 0) {
    return NextResponse.json({ error: "rentPaymentId and positive paidAmount are required" }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("rent_payments")
    .select("id, rent_charge_id, paid_amount, rent_charges(per_tenant_amount)")
    .eq("id", rentPaymentId)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (paymentError || !payment) return NextResponse.json({ error: "Rent payment not found" }, { status: 404 });

  const perTenantAmount = Number((payment as any).rent_charges?.per_tenant_amount || 0);
  const totalPaid = Number(payment.paid_amount || 0) + paidAmount;
  const status = totalPaid >= perTenantAmount ? "paid" : totalPaid > 0 ? "partial" : "pending";

  const { data, error } = await supabase
    .from("rent_payments")
    .update({
      paid_amount: totalPaid,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null
    })
    .eq("id", rentPaymentId)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, dueAmount: perTenantAmount });
}

export async function POST(req: Request) {
  return markRentPayment(req);
}

export async function PATCH(req: Request) {
  return markRentPayment(req);
}
