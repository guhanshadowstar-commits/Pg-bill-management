import OpenAI from "openai";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthBoundaries(month: string) {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    year: y,
    month: m,
    start: `${y}-${pad2(m)}-01`,
    end: `${y}-${pad2(m)}-${pad2(last)}`
  };
}

function localFallback(text: string, month: string) {
  const { year, month: mm, start, end } = monthBoundaries(month);
  const parts = text.split(/[.\n]/).map((s) => s.trim()).filter(Boolean);

  const tenant_ranges: { tenant: string; start_date: string; end_date: string }[] = [];

  for (const p of parts) {
    const name = p.match(/^([A-Za-z]+)\b/)?.[1];
    if (!name) continue;

    if (/full month|whole month/i.test(p)) {
      tenant_ranges.push({ tenant: name, start_date: start, end_date: end });
      continue;
    }

    const left = p.match(/left on\s+(\d{1,2})/i);
    if (left) {
      tenant_ranges.push({ tenant: name, start_date: start, end_date: `${year}-${pad2(mm)}-${pad2(Number(left[1]))}` });
      continue;
    }

    const joined = p.match(/joined on\s+(\d{1,2})/i);
    if (joined) {
      tenant_ranges.push({ tenant: name, start_date: `${year}-${pad2(mm)}-${pad2(Number(joined[1]))}`, end_date: end });
      continue;
    }

    const fromTo = p.match(/from\s+\w+\s*(\d{1,2})\s+to\s+\w+\s*(\d{1,2})/i);
    if (fromTo) {
      tenant_ranges.push({
        tenant: name,
        start_date: `${year}-${pad2(mm)}-${pad2(Number(fromTo[1]))}`,
        end_date: `${year}-${pad2(mm)}-${pad2(Number(fromTo[2]))}`
      });
    }
  }

  return { tenant_ranges };
}

export async function parseOccupancyText(input: { text: string; month: string }) {
  if (!process.env.OPENAI_API_KEY) {
    return localFallback(input.text, input.month);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "Extract tenant occupancy into strict JSON. Output only: { tenant_ranges: [{tenant,start_date,end_date}] }. Dates must be YYYY-MM-DD."
      },
      { role: "user", content: `Month: ${input.month}\nText: ${input.text}` }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tenant_ranges",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            tenant_ranges: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  tenant: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" }
                },
                required: ["tenant", "start_date", "end_date"]
              }
            }
          },
          required: ["tenant_ranges"]
        }
      }
    }
  });

  return JSON.parse(response.output_text);
}
