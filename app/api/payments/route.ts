import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const body = await req.json();
  const billSplitId = String(body.billSplitId || "").trim();
  const paidAmount = Number(body.paidAmount);
  const method = body.method ? String(body.method) : "cash";
  const txnRef = body.txnRef ? String(body.txnRef) : null;

  if (!billSplitId || !Number.isFinite(paidAmount) || paidAmount <= 0) {
    return NextResponse.json({ error: "billSplitId and positive paidAmount are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: split, error: splitError } = await supabase
      .from("bill_splits")
      .select("id, amount, tenant_id")
      .eq("id", billSplitId)
      .eq("owner_id", session.owner.owner_id)
      .single();

    if (splitError || !split) return NextResponse.json({ error: "Bill split not found" }, { status: 404 });

    const { error: paymentError } = await supabase.from("payments").insert({
      owner_id: session.owner.owner_id,
      bill_split_id: billSplitId,
      paid_amount: paidAmount,
      payment_date: new Date().toISOString().slice(0, 10),
      status: "pending",
      method,
      txn_ref: txnRef
    });

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

    const { data: existingPayments, error: existingError } = await supabase
      .from("payments")
      .select("paid_amount")
      .eq("owner_id", session.owner.owner_id)
      .eq("bill_split_id", billSplitId);

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

    const totalPaid = (existingPayments || []).reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);
    const status = totalPaid >= Number(split.amount) ? "paid" : totalPaid > 0 ? "partial" : "pending";

    const { error: splitUpdateError } = await supabase
      .from("bill_splits")
      .update({ status })
      .eq("id", billSplitId)
      .eq("owner_id", session.owner.owner_id);
    if (splitUpdateError) return NextResponse.json({ error: splitUpdateError.message }, { status: 400 });

    await supabase.from("tenants").update({ payment_status: status }).eq("id", split.tenant_id).eq("owner_id", session.owner.owner_id);

    return NextResponse.json({ ok: true, status, totalPaid, dueAmount: Number(split.amount) });
  }

  const db = await readDb();
  const split = db.bill_splits.find((s) => s.id === billSplitId && belongsToOwner(s, session.owner.owner_id));
  if (!split) return NextResponse.json({ error: "Bill split not found" }, { status: 404 });

  db.payments.push({
    id: uid("pay"),
    owner_id: session.owner.owner_id,
    bill_split_id: billSplitId,
    paid_amount: paidAmount,
    payment_date: new Date().toISOString().slice(0, 10),
    status: "pending",
    method,
    txn_ref: txnRef,
    created_at: new Date().toISOString()
  });

  const totalPaid = db.payments
    .filter((p) => p.bill_split_id === billSplitId && belongsToOwner(p, session.owner.owner_id))
    .reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

  split.status = totalPaid >= split.amount ? "paid" : totalPaid > 0 ? "partial" : "pending";
  const tenant = db.tenants.find((t) => t.id === split.tenant_id && belongsToOwner(t, session.owner.owner_id));
  if (tenant) tenant.payment_status = split.status;

  await writeDb(db);
  return NextResponse.json({ ok: true, status: split.status, totalPaid, dueAmount: split.amount });
}
