import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const { id } = await params;
  const body = await req.json();
  const { owner_id: _ownerId, id: _bodyId, created_at: _createdAt, ...safeBody } = body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("tenants")
    .update(safeBody)
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
