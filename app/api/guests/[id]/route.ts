import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action || "").trim();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const { data: request, error: fetchError } = await supabase
    .from("guest_requests")
    .select("id, status")
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (fetchError || !request) return NextResponse.json({ error: "Guest request not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be approved or rejected" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (action === "approve") {
    const chargeAmount = Number(body.charge_amount);
    if (!Number.isFinite(chargeAmount) || chargeAmount < 0) {
      return NextResponse.json({ error: "A charge_amount (0 or more) is required to approve" }, { status: 400 });
    }
    updates.status = "approved";
    updates.charge_amount = chargeAmount;
  } else {
    updates.status = "rejected";
  }

  const { data, error } = await supabase
    .from("guest_requests")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
