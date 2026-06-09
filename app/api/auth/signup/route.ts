import { NextResponse } from "next/server";
import {
  createOwnerSession,
  hashOwnerPassword,
  normalizeUsername,
  OWNER_SESSION_COOKIE,
  SESSION_TTL_SECONDS
} from "@/lib/owner-auth";
import { readDb, writeDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uid } from "@/lib/utils";

function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,40}$/.test(username);
}

export async function POST(req: Request) {
  const body = await req.json();
  const username = normalizeUsername(String(body.username || ""));
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const password = String(body.password || "");

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-40 characters and use only letters, numbers, dots, underscores, or hyphens." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const passwordHash = await hashOwnerPassword(password);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: existing } = await supabase.from("owner_accounts").select("id").eq("username", username).maybeSingle();
    if (existing) return NextResponse.json({ error: "This username is already taken." }, { status: 409 });

    const { data: owner, error } = await supabase
      .from("owner_accounts")
      .insert({ username, email, password_hash: passwordHash })
      .select("id, username")
      .single();

    if (error || !owner) {
      return NextResponse.json({ error: error?.message || "Unable to create owner account." }, { status: 400 });
    }

    return createSignupResponse(owner.username, owner.id);
  }

  const db = await readDb();
  if (db.owner_accounts.some((account) => account.username === username)) {
    return NextResponse.json({ error: "This username is already taken." }, { status: 409 });
  }

  const owner = {
    id: uid("owner"),
    username,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };

  db.owner_accounts.push(owner);
  await writeDb(db);
  return createSignupResponse(owner.username, owner.id);
}

async function createSignupResponse(username: string, ownerId: string) {
  const session = await createOwnerSession(username, ownerId);
  const res = NextResponse.json({ ok: true, owner_id: ownerId });
  res.cookies.set(OWNER_SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res;
}
