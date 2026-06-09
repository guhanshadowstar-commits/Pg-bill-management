import { NextResponse } from "next/server";
import { calculateBillSplit } from "@/lib/billing";
import { readDb, writeDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("electricity_bills")
      .select("id, room_id, bill_month, total_amount, total_person_days, per_person_day_cost, created_at, rooms(room_number), bill_splits(id, bill_id, tenant_id, days_stayed, amount, status, created_at, tenants(full_name))")
      .eq("owner_id", session.owner.owner_id)
      .order("bill_month", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const db = await readDb();
  const rows = db.electricity_bills
    .filter((bill) => belongsToOwner(bill, session.owner.owner_id))
    .sort((a, b) => b.bill_month.localeCompare(a.bill_month))
    .map((bill) => ({
      ...bill,
      rooms: { room_number: db.rooms.find((r) => r.id === bill.room_id && belongsToOwner(r, session.owner.owner_id))?.room_number || "-" },
      bill_splits: db.bill_splits
        .filter((s) => s.bill_id === bill.id && belongsToOwner(s, session.owner.owner_id))
        .map((s) => ({
          ...s,
          tenants: { full_name: db.tenants.find((t) => t.id === s.tenant_id && belongsToOwner(t, session.owner.owner_id))?.full_name || "-" }
        }))
    }));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const body = await req.json();
  const roomNumber = String(body.roomNumber || "").trim();
  const month = String(body.month || "").trim();
  const totalBill = Number(body.totalBill);

  if (!roomNumber || !month || !Number.isFinite(totalBill) || totalBill < 0) {
    return NextResponse.json({ error: "roomNumber, month and valid totalBill are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, room_number")
      .eq("room_number", roomNumber)
      .eq("owner_id", session.owner.owner_id)
      .single();

    if (roomError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { data: logs, error: logError } = await supabase
      .from("occupancy_logs")
      .select("tenant_id, check_in, check_out, tenants(full_name)")
      .eq("owner_id", session.owner.owner_id)
      .eq("room_id", room.id);

    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });

    const parsed = (logs || []).map((l: any) => ({
      tenantId: l.tenant_id,
      tenantName: l.tenants?.full_name || "Unknown",
      checkIn: l.check_in,
      checkOut: l.check_out
    }));

    const calc = calculateBillSplit({ totalBill, roomNumber, month, logs: parsed });

    const { data: bill, error: billError } = await supabase
      .from("electricity_bills")
      .upsert(
        {
          owner_id: session.owner.owner_id,
          room_id: room.id,
          bill_month: month,
          total_amount: totalBill,
          total_person_days: calc.totalPersonDays,
          per_person_day_cost: calc.perPersonDayCost
        },
        { onConflict: "room_id,bill_month" }
      )
      .select("id")
      .single();

    if (billError || !bill) return NextResponse.json({ error: billError?.message || "Unable to save bill" }, { status: 400 });

    const { error: delError } = await supabase
      .from("bill_splits")
      .delete()
      .eq("bill_id", bill.id)
      .eq("owner_id", session.owner.owner_id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });

    if (calc.splits.length > 0) {
      const payload = calc.splits.map((s) => ({
        owner_id: session.owner.owner_id,
        bill_id: bill.id,
        tenant_id: s.tenantId,
        days_stayed: s.daysStayed,
        amount: s.amount,
        status: "pending"
      }));

      const { error: splitError } = await supabase.from("bill_splits").insert(payload);
      if (splitError) return NextResponse.json({ error: splitError.message }, { status: 400 });
    }

    return NextResponse.json({ ...calc, billId: bill.id, saved: true });
  }

  const db = await readDb();
  const room = db.rooms.find((r) => r.room_number === roomNumber && belongsToOwner(r, session.owner.owner_id));
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const logs = db.occupancy_logs
    .filter((o) => o.room_id === room.id && belongsToOwner(o, session.owner.owner_id))
    .map((o) => ({
      tenantId: o.tenant_id,
      tenantName: db.tenants.find((t) => t.id === o.tenant_id && belongsToOwner(t, session.owner.owner_id))?.full_name || "Unknown",
      checkIn: o.check_in,
      checkOut: o.check_out
    }));

  const calc = calculateBillSplit({ totalBill, month, roomNumber, logs });
  const existing = db.electricity_bills.find(
    (b) => b.room_id === room.id && b.bill_month === month && belongsToOwner(b, session.owner.owner_id)
  );
  const billId = existing?.id || uid("bill");

  db.electricity_bills = db.electricity_bills.filter(
    (b) => !(b.room_id === room.id && b.bill_month === month && belongsToOwner(b, session.owner.owner_id))
  );
  db.electricity_bills.push({
    id: billId,
    owner_id: session.owner.owner_id,
    room_id: room.id,
    bill_month: month,
    total_amount: totalBill,
    total_person_days: calc.totalPersonDays,
    per_person_day_cost: calc.perPersonDayCost,
    created_at: new Date().toISOString()
  });

  db.bill_splits = db.bill_splits.filter((s) => s.bill_id !== billId || !belongsToOwner(s, session.owner.owner_id));
  for (const split of calc.splits) {
    db.bill_splits.push({
      id: uid("split"),
      owner_id: session.owner.owner_id,
      bill_id: billId,
      tenant_id: split.tenantId,
      days_stayed: split.daysStayed,
      amount: split.amount,
      status: "pending",
      created_at: new Date().toISOString()
    });
  }

  await writeDb(db);
  return NextResponse.json({ ...calc, billId, saved: true });
}
