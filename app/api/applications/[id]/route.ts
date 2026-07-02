import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action || "").trim();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const { data: application, error: applicationError } = await supabase
    .from("tenant_applications")
    .select("*")
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: `Application is already ${application.status}` }, { status: 400 });
  }

  if (action === "approve") {
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ owner_id: session.owner.owner_id, full_name: application.full_name, phone: application.phone })
      .select("id")
      .single();

    if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 400 });

    const { data, error } = await supabase
      .from("tenant_applications")
      .update({ status: "approved" })
      .eq("id", id)
      .eq("owner_id", session.owner.owner_id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ...data, tenant_id: tenant.id });
  }

  const { data, error } = await supabase
    .from("tenant_applications")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
