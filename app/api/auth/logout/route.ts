import { NextResponse } from "next/server";
import { OWNER_SESSION_COOKIE } from "@/lib/owner-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res;
}
