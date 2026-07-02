import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const { owner_id: _ownerId, id: _bodyId, created_at: _createdAt, room_id: _roomId, ...safeBody } = body;

  if (safeBody.status && !["vacant", "occupied", "reserved", "maintenance"].includes(safeBody.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("beds")
    .update(safeBody)
    .eq("id", id)
    .eq("owner_id", session.owner.owner_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
