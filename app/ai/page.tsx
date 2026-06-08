"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; text: string };

const quickQuestions = [
  "How is EB bill calculated?",
  "How do I add a tenant entry?",
  "What should I do when a tenant leaves?",
  "Where is data saved?",
  "How do payments work?"
];

export default function AIHelpPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ask me anything about using this app: bill calculation, tenant entry, checkout, history, payments, or database setup."
    }
  ]);

  async function ask(nextQuestion = question) {
    const clean = nextQuestion.trim();
    if (!clean || loading) return;

    setQuestion("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: clean }]);

    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: clean })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer || data.error || "I could not answer that yet." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Try again once the app is running normally." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="min-h-[620px]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">AI Help Assistant</h2>
          <p className="mt-1 text-sm text-mist">Simple guidance for calculations, entries, checkout, history and payments.</p>
        </div>

        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[82%] rounded-2xl bg-gold px-4 py-3 text-sm text-ink" : "max-w-[82%] whitespace-pre-line rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-black/20 dark:text-pearl"}>
                {message.text}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-mist">Thinking...</p>}
        </div>

        <div className="mt-6 flex flex-col gap-2 md:flex-row">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
            placeholder="Ask: how to calculate a room bill, how to checkout tenant, where data is saved..."
            className="min-h-24 flex-1 rounded-xl border border-black/10 bg-white p-3 text-sm outline-none ring-gold/40 placeholder:text-mist focus:ring dark:border-white/15 dark:bg-black/20"
          />
          <Button onClick={() => ask()} disabled={!question.trim() || loading} className="md:self-end">
            Ask
          </Button>
        </div>
      </Card>

      <aside className="space-y-4">
        <Card>
          <h3 className="font-semibold">Quick Questions</h3>
          <div className="mt-3 space-y-2">
            {quickQuestions.map((item) => (
              <button
                key={item}
                onClick={() => ask(item)}
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-left text-sm transition hover:border-gold dark:border-white/10"
              >
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">Remember</h3>
          <p className="mt-2 text-sm text-mist">
            For normal tenant leaving, use checkout. Deleting stay rows removes history and can break old bill proof.
          </p>
        </Card>
      </aside>
    </main>
  );
}
