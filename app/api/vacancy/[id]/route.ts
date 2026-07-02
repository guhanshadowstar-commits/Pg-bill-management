import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Note: 'complete' only marks the vacancy request completed. The actual checkout
// (mandatory meter reading + bed release) still happens via PATCH /api/occupancy/[id].
const transitions: Record<string, { from: string; to: "approved" | "completed" | "cancelled" }> = {
  approve: { from: "pending", to: "approved" },
  complete: { from: "approved", to: "completed" },
  cancel: { from: "pending", to: "cancelled" }
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action || "").trim();
  const transition = transitions[action];

  if (!transition) {
    return NextResponse.json({ error: "action must be 'approve', 'complete' or 'cancel'" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("vacancy_requests")
    .select("id, status")
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Vacancy request not found" }, { status: 404 });
  }

  if (existing.status !== transition.from) {
    return NextResponse.json(
      { error: `Cannot ${action} a request that is ${existing.status} (must be ${transition.from})` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("vacancy_requests")
    .update({ status: transition.to })
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
