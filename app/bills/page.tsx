"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CalcResult = {
  roomNumber: string;
  totalBill: number;
  totalPersonDays: number;
  perPersonDayCost: number;
  splits: { tenantId: string; tenantName: string; daysStayed: number; amount: number }[];
};

type Bill = {
  id: string;
  bill_month: string;
  total_amount: number;
  rooms: { room_number: string };
  bill_splits: { id: string; days_stayed: number; amount: number; status: string; tenants: { full_name: string } }[];
};

export default function BillsPage() {
  const [form, setForm] = useState({ roomNumber: "204", month: "2026-05-01", totalBill: 4000 });
  const [aiText, setAiText] = useState("Room 204 bill is 3200. Arun stayed full month. Rahul left on 12th. Kiran joined on 18th.");
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [aiResult, setAiResult] = useState<string>("");

  async function loadBills() {
    const data = await fetch("/api/bills").then((r) => r.json());
    setBills(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadBills();
  }, []);

  async function calculate() {
    const data = await fetch("/api/bills/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).then((r) => r.json());
    setCalc(data);
  }

  async function saveBill() {
    const data = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).then((r) => r.json());
    setCalc(data);
    await loadBills();
  }

  async function parseAi() {
    const data = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: aiText, month: form.month })
    }).then((r) => r.json());

    setAiResult(JSON.stringify(data, null, 2));
  }

  async function markPaid(splitId: string, amount: number) {
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billSplitId: splitId, paidAmount: amount, method: "cash" })
    });
    await loadBills();
  }

  return (
    <main className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Generate Bill</h2>
          <div className="mt-3 space-y-3">
            <Input value={form.roomNumber} onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))} placeholder="Room Number" />
            <Input type="month" value={form.month.slice(0, 7)} onChange={(e) => setForm((p) => ({ ...p, month: `${e.target.value}-01` }))} />
            <Input type="number" value={form.totalBill} onChange={(e) => setForm((p) => ({ ...p, totalBill: Number(e.target.value) }))} placeholder="Total Bill" />
            <div className="flex gap-2">
              <Button onClick={calculate}>Calculate</Button>
              <Button onClick={saveBill} className="bg-ink text-pearl dark:bg-gold dark:text-ink">Save Bill</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">AI Occupancy Parser</h2>
          <textarea
            className="mt-3 h-40 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none dark:border-white/15 dark:bg-black/20"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={parseAi}>Parse</Button>
          </div>
          {aiResult && <pre className="mt-3 overflow-auto rounded-xl border border-black/10 p-3 text-xs dark:border-white/15">{aiResult}</pre>}
        </Card>
      </section>

      {calc && (
        <Card>
          <h3 className="text-lg font-semibold">Calculation Result</h3>
          <p className="text-sm text-mist">Total Person-Days: {calc.totalPersonDays} | Per Day: ₹{calc.perPersonDayCost}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-mist dark:border-white/10">
                  <th className="py-2">Tenant</th><th>Days</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {calc.splits.map((s) => (
                  <tr key={s.tenantId} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2">{s.tenantName}</td><td>{s.daysStayed}</td><td>₹{s.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold">Generated Bills</h3>
        <div className="mt-3 space-y-4">
          {bills.map((bill) => (
            <div key={bill.id} className="rounded-xl border border-black/10 p-3 dark:border-white/15">
              <p className="text-sm font-semibold">Room {bill.rooms.room_number} | {bill.bill_month.slice(0, 7)} | ₹{bill.total_amount}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-mist dark:border-white/10">
                      <th className="py-2">Tenant</th><th>Days</th><th>Amount</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.bill_splits.map((s) => (
                      <tr key={s.id} className="border-b border-black/5 dark:border-white/5">
                        <td className="py-2">{s.tenants.full_name}</td>
                        <td>{s.days_stayed}</td>
                        <td>₹{s.amount}</td>
                        <td>{s.status}</td>
                        <td>
                          {s.status !== "paid" && (
                            <button className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20" onClick={() => markPaid(s.id, s.amount)}>
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!bills.length && <p className="text-sm text-mist">No bills yet.</p>}
        </div>
      </Card>
    </main>
  );
}
