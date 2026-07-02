import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const { id } = await params;
  const body = await req.json();
  const check_out = body.check_out ? String(body.check_out).trim() : null;
  const meter_reading = body.meter_reading !== undefined ? Number(body.meter_reading) : null;

  if (check_out && !isDateOnly(check_out)) {
    return NextResponse.json({ error: "check_out must be YYYY-MM-DD" }, { status: 400 });
  }

  if (check_out && (meter_reading === null || !Number.isFinite(meter_reading))) {
    return NextResponse.json({ error: "meter_reading is required when checking out" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  {
    const { data: existing, error: existingError } = await supabase
      .from("occupancy_logs")
      .select("id, room_id, bed_id, check_in")
      .eq("id", id)
      .eq("owner_id", session.owner.owner_id)
      .single();

    if (existingError || !existing) return NextResponse.json({ error: "Occupancy log not found" }, { status: 404 });
    if (check_out && check_out < existing.check_in) {
      return NextResponse.json({ error: "check_out cannot be before check_in" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("occupancy_logs")
      .update({ check_out })
      .eq("id", id)
      .eq("owner_id", session.owner.owner_id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (check_out) {
      const { error: readingError } = await supabase.from("room_meter_readings").insert({
        owner_id: session.owner.owner_id,
        room_id: existing.room_id,
        occupancy_log_id: id,
        reading_value: meter_reading,
        reading_type: "checkout",
        reading_date: check_out
      });

      if (readingError) return NextResponse.json({ error: readingError.message }, { status: 400 });

      if (existing.bed_id) {
        const { error: bedError } = await supabase
          .from("beds")
          .update({ status: "vacant" })
          .eq("id", existing.bed_id)
          .eq("owner_id", session.owner.owner_id);

        if (bedError) return NextResponse.json({ error: bedError.message }, { status: 400 });
      }
    }

    return NextResponse.json(data);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "true";

  if (!force) {
    return NextResponse.json(
      { error: "History is preserved. Set a check-out date instead of deleting this occupancy log." },
      { status: 405 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { error } = await supabase.from("occupancy_logs").delete().eq("id", id).eq("owner_id", session.owner.owner_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
