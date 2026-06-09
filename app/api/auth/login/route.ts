import { NextResponse } from "next/server";
import {
  createOwnerSession,
  getValidEnvOwnerLogin,
  hasOwnerPassword,
  normalizeUsername,
  OWNER_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyOwnerPassword
} from "@/lib/owner-auth";
import { readDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();
  const username = normalizeUsername(String(body.username || ""));
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: owner, error } = await supabase
      .from("owner_accounts")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();

    if (owner && !error && await verifyOwnerPassword(password, owner.password_hash)) {
      return createLoginResponse(owner.username, owner.id);
    }
  } else {
    const db = await readDb();
    const owner = db.owner_accounts.find((account) => account.username === username);
    if (owner && await verifyOwnerPassword(password, owner.password_hash)) {
      return createLoginResponse(owner.username, owner.id);
    }
  }

  const envOwner = getValidEnvOwnerLogin(username, password);
  if (envOwner) {
    return createLoginResponse(envOwner.username, envOwner.owner_id);
  }

  if (!supabase && !hasOwnerPassword()) {
    return NextResponse.json(
      { error: "No owner account found. Create an owner account first." },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "Invalid owner username or password" }, { status: 401 });
}

async function createLoginResponse(username: string, ownerId: string) {
  const session = await createOwnerSession(username, ownerId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res;
}
