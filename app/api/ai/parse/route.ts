import { NextResponse } from "next/server";
import { parseOccupancyText } from "@/lib/ai-parser";

export async function POST(req: Request) {
  const body = await req.json();
  const { text, month } = body as { text: string; month: string };

  if (!text || !month) {
    return NextResponse.json({ error: "text and month are required" }, { status: 400 });
  }

  try {
    const parsed = await parseOccupancyText({ text, month });
    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "AI parse failed" }, { status: 500 });
  }
}
