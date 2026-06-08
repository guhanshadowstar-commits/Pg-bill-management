import OpenAI from "openai";

const SYSTEM_PROMPT = `You are the AI help assistant inside a PG Electricity Bill Manager app.
Answer only about using this app: rooms, tenants, check-in/check-out, history, electricity bill calculation, payments, Supabase setup, and common mistakes.
Keep answers simple, practical, and short.
Billing formula: Individual Bill = (Days Stayed / Total Person-Days) * Total Electricity Bill.
Important rule: never delete occupancy history for a normal checkout; set check_out so old records remain available for future audits and calculations.`;

function localAnswer(question: string) {
  const q = question.toLowerCase();

  if (q.includes("calculate") || q.includes("formula") || q.includes("split") || q.includes("eb") || q.includes("bill")) {
    return [
      "EB bill calculation is based on person-days, not equal split.",
      "",
      "Formula: Individual Bill = (Days Stayed / Total Person-Days) x Total EB Bill.",
      "",
      "Example method: add every tenant's days stayed for that billing month to get total person-days.",
      "Then divide the total EB bill by total person-days to get the per-day cost.",
      "Each tenant pays their days stayed multiplied by the per-day cost.",
      "",
      "The app automatically counts only the days that overlap with the selected billing month."
    ].join("\n");
  }

  if (q.includes("tenant") || q.includes("entry") || q.includes("add") || q.includes("assign")) {
    return [
      "To enter a tenant:",
      "1. Go to Tenants.",
      "2. Add the tenant name and phone.",
      "3. In Assign Tenant, choose room, tenant, check-in date, and optional check-out date.",
      "4. Save it.",
      "",
      "If the tenant is still staying, leave checkout blank. The app treats them as active."
    ].join("\n");
  }

  if (q.includes("delete") || q.includes("checkout") || q.includes("left") || q.includes("outgoer") || q.includes("history")) {
    return [
      "Do not delete a tenant stay record when someone leaves.",
      "",
      "Use Check out and enter their leaving date. This preserves history for the past 3 years and keeps old bills auditable.",
      "",
      "History page shows active tenants and checked-out tenants, including incomers and outgoers."
    ].join("\n");
  }

  if (q.includes("database") || q.includes("save") || q.includes("remember") || q.includes("stored")) {
    return [
      "The app has two storage modes:",
      "",
      "Local mode: saves into data/db.json on your computer for testing.",
      "Live mode: saves into Supabase database, so data stays online even when your laptop is off.",
      "",
      "For real users, we will connect Supabase before deployment."
    ].join("\n");
  }

  if (q.includes("payment") || q.includes("paid") || q.includes("pending")) {
    return [
      "After saving a bill, go to Bills.",
      "Each tenant split has a status. Click Mark Paid when the tenant pays.",
      "Dashboard then updates pending payments and monthly revenue."
    ].join("\n");
  }

  return [
    "I can help with rooms, tenants, check-in/check-out, EB split calculation, history, payments, and database setup.",
    "",
    "Most important rule: add check-in and check-out dates correctly. The bill is then calculated from exact person-days."
  ].join("\n");
}

export async function answerHelpQuestion(question: string) {
  if (!process.env.OPENAI_API_KEY) return localAnswer(question);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question }
    ]
  });

  return response.output_text || localAnswer(question);
}
