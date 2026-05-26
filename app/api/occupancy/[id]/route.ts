import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("occupancy_logs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const db = await readDb();
  db.occupancy_logs = db.occupancy_logs.filter((o) => o.id !== id);
  await writeDb(db);
  return NextResponse.json({ ok: true });
}
