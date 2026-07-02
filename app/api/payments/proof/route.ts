import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "payment-proofs";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function tableFor(kind: string) {
  if (kind === "eb") return "payments";
  if (kind === "rent") return "rent_payments";
  return null;
}

// For EB, callers may pass a bill_split_id instead of a payments row id
// (the bills UI works with splits). Resolve to the latest payment for that split.
async function resolvePaymentId(supabase: any, table: string, id: string, ownerId: string): Promise<string | null> {
  const direct = await supabase.from(table).select("id").eq("id", id).eq("owner_id", ownerId).maybeSingle();
  if (direct.data?.id) return direct.data.id;

  if (table === "payments") {
    const bySplit = await supabase
      .from("payments")
      .select("id")
      .eq("bill_split_id", id)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bySplit.data?.id) return bySplit.data.id;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file");
  const paymentId = String(form.get("payment_id") || "").trim();
  const kind = String(form.get("payment_kind") || "").trim();
  const table = tableFor(kind);

  if (!(file instanceof File) || !paymentId || !table) {
    return NextResponse.json({ error: "file, payment_id and payment_kind (eb|rent) are required" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });

  const resolvedId = await resolvePaymentId(supabase, table, paymentId, session.owner.owner_id);
  if (!resolvedId) {
    return NextResponse.json(
      { error: table === "payments" ? "No payment found. Record a payment for this split first." : "Payment not found" },
      { status: 404 }
    );
  }

  const path = `${session.owner.owner_id}/${resolvedId}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}. Ensure the "${BUCKET}" storage bucket exists in Supabase.` },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ proof_url: path, proof_uploaded_by: "owner" })
    .eq("id", resolvedId)
    .eq("owner_id", session.owner.owner_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true, proof_url: path });
}

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const paymentId = String(searchParams.get("payment_id") || "").trim();
  const kind = String(searchParams.get("kind") || "").trim();
  const table = tableFor(kind);

  if (!paymentId || !table) {
    return NextResponse.json({ error: "payment_id and kind (eb|rent) are required" }, { status: 400 });
  }

  const resolvedId = await resolvePaymentId(supabase, table, paymentId, session.owner.owner_id);
  if (!resolvedId) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const { data: payment, error: paymentError } = await supabase
    .from(table)
    .select("id, proof_url")
    .eq("id", resolvedId)
    .eq("owner_id", session.owner.owner_id)
    .single();

  if (paymentError || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (!payment.proof_url) return NextResponse.json({ error: "No proof uploaded for this payment" }, { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(payment.proof_url, 60 * 10);

  if (signError || !signed) return NextResponse.json({ error: signError?.message || "Could not sign URL" }, { status: 400 });
  return NextResponse.json({ url: signed.signedUrl });
}
