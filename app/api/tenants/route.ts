import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  }

  const db = await readDb();
  return NextResponse.json([...db.tenants].sort((a, b) => b.created_at.localeCompare(a.created_at)));
}

export async function POST(req: Request) {
  const body = await req.json();
  const fullName = String(body.full_name || "").trim();

  if (!fullName) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const phone = body.phone ? String(body.phone) : null;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("tenants")
      .insert({ full_name: fullName, phone, payment_status: "pending" })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

  const db = await readDb();
  const row = {
    id: uid("tenant"),
    full_name: fullName,
    phone,
    payment_status: "pending" as const,
    created_at: new Date().toISOString()
  };

  db.tenants.push(row);
  await writeDb(db);
  return NextResponse.json(row, { status: 201 });
}
