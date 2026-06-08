import { NextResponse } from "next/server";
import { answerHelpQuestion } from "@/lib/help-assistant";

export async function POST(req: Request) {
  const body = await req.json();
  const question = String(body.question || "").trim();

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    const answer = await answerHelpQuestion(question);
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "AI help failed" }, { status: 500 });
  }
}
