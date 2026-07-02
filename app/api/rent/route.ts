import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("rent_charges")
    .select(
      "id, room_id, charge_month, total_rent, occupant_count, per_tenant_amount, created_at, rooms(room_number), rent_payments(id, rent_charge_id, tenant_id, paid_amount, status, paid_at, created_at, tenants(full_name))"
    )
    .eq("owner_id", session.owner.owner_id)
    .order("charge_month", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const body = await req.json();
  const room_id = String(body.room_id || "").trim();
  const charge_month = String(body.month || "").trim();
  const total_rent = Number(body.total_rent);

  if (!room_id || !charge_month) {
    return NextResponse.json({ error: "room_id and month are required" }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, monthly_rent")
    .eq("id", room_id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (roomError || !room) return NextResponse.json({ error: "Room not found for this owner" }, { status: 404 });

  const effectiveRent = Number.isFinite(total_rent) && total_rent > 0 ? total_rent : Number(room.monthly_rent || 0);

  if (!effectiveRent || effectiveRent <= 0) {
    return NextResponse.json({ error: "total_rent is required (room has no monthly_rent set)" }, { status: 400 });
  }

  const monthStart = `${charge_month}-01`;
  const { data: activeLogs, error: logsError } = await supabase
    .from("occupancy_logs")
    .select("tenant_id, bed_id, check_in, check_out")
    .eq("owner_id", session.owner.owner_id)
    .eq("room_id", room_id)
    .is("check_out", null);

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 400 });

  const activeTenantIds = Array.from(new Set((activeLogs || []).map((l) => l.tenant_id)));
  const occupant_count = activeTenantIds.length;

  if (occupant_count === 0) {
    return NextResponse.json({ error: "No active occupants in this room" }, { status: 400 });
  }

  const per_tenant_amount = Number((effectiveRent / occupant_count).toFixed(2));

  const { data: charge, error: chargeError } = await supabase
    .from("rent_charges")
    .upsert(
      {
        owner_id: session.owner.owner_id,
        room_id,
        charge_month: monthStart,
        total_rent: effectiveRent,
        occupant_count,
        per_tenant_amount
      },
      { onConflict: "owner_id,room_id,charge_month" }
    )
    .select("*")
    .single();

  if (chargeError || !charge) {
    return NextResponse.json({ error: chargeError?.message || "Unable to save rent charge" }, { status: 400 });
  }

  const { error: delError } = await supabase
    .from("rent_payments")
    .delete()
    .eq("rent_charge_id", charge.id)
    .eq("owner_id", session.owner.owner_id);

  if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });

  const paymentRows = activeTenantIds.map((tenant_id) => ({
    owner_id: session.owner.owner_id,
    rent_charge_id: charge.id,
    tenant_id,
    paid_amount: 0,
    status: "pending"
  }));

  const { data: payments, error: paymentsError } = await supabase
    .from("rent_payments")
    .insert(paymentRows)
    .select("*");

  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 400 });

  return NextResponse.json({ ...charge, rent_payments: payments || [] }, { status: 201 });
}
