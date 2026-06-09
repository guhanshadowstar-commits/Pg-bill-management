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

function ownerAuthEmail(username: string) {
  return `${username}@pg-bill-owner.app`;
}

function isMissingOwnerAccountsTable(error?: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST205" ||
        error.message?.includes("owner_accounts") ||
        error.message?.includes("schema cache"))
  );
}

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

    if (isMissingOwnerAccountsTable(error)) {
      const { data: authLogin } = await supabase.auth.signInWithPassword({
        email: ownerAuthEmail(username),
        password
      });

      if (authLogin.user) {
        const authUsername = String(authLogin.user.user_metadata?.username || username);
        return createLoginResponse(authUsername, authLogin.user.id);
      }
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
