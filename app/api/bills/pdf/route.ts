import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();

  return NextResponse.json({
    ok: true,
    message: "PDF route scaffold is ready. You can connect html-to-pdf renderer here.",
    payload
  });
}
