"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Room = { id: string; room_number: string };

type RentPayment = {
  id: string;
  rent_charge_id: string;
  tenant_id: string;
  paid_amount: number;
  status: string;
  paid_at: string | null;
  tenants: { full_name: string };
};

type RentCharge = {
  id: string;
  room_id: string;
  charge_month: string;
  total_rent: number;
  occupant_count: number;
  per_tenant_amount: number;
  rooms: { room_number: string };
  rent_payments: RentPayment[];
};

type GenerateResult = RentCharge | { error: string };

export default function RentPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ room_id: "", month: currentMonth, total_rent: "" });
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [generateError, setGenerateError] = useState("");
  const [lastResult, setLastResult] = useState<RentCharge | null>(null);

  async function load() {
    const [r, c] = await Promise.all([
      fetch("/api/rooms").then((x) => x.json()),
      fetch("/api/rent").then((x) => x.json())
    ]);
    setRooms(Array.isArray(r) ? r : []);
    setCharges(Array.isArray(c) ? c : []);
    if (r?.[0] && !form.room_id) setForm((p) => ({ ...p, room_id: r[0].id }));
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    const data: GenerateResult = await fetch("/api/rent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: form.room_id,
        month: form.month,
        total_rent: form.total_rent ? Number(form.total_rent) : undefined
      })
    }).then((r) => r.json());

    if ("error" in data) {
      setGenerateError(data.error);
      setLastResult(null);
      return;
    }
    setGenerateError("");
    setLastResult(data);
    await load();
  }

  async function markPaid(payment: RentPayment, dueAmount: number) {
    const remaining = Number((dueAmount - payment.paid_amount).toFixed(2));
    if (remaining <= 0) return;
    await fetch("/api/rent/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentPaymentId: payment.id, paidAmount: remaining })
    });
    await load();
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Generate Rent Charge</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select value={form.room_id} onChange={(e) => setForm((p) => ({ ...p, room_id: e.target.value }))}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>Room {r.room_number}</option>
            ))}
          </Select>
          <Input type="month" value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} />
          <Input
            type="number"
            placeholder="Total Rent (optional, uses room rent if blank)"
            value={form.total_rent}
            onChange={(e) => setForm((p) => ({ ...p, total_rent: e.target.value }))}
          />
          <Button onClick={generate} disabled={!form.room_id || !form.month}>Generate</Button>
        </div>
      </Card>

      {generateError && (
        <Card className="border-amber-500/30">
          <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-300">Cannot generate rent charge</h3>
          <p className="mt-1 text-sm text-mist">{generateError}</p>
        </Card>
      )}

      {lastResult && (
        <Card>
          <h3 className="text-lg font-semibold">Generated</h3>
          <p className="text-sm text-mist">
            Room {lastResult.rooms.room_number} | {lastResult.charge_month.slice(0, 7)} | Total ₹{lastResult.total_rent} |{" "}
            {lastResult.occupant_count} occupant(s) | ₹{lastResult.per_tenant_amount} per tenant
          </p>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold">Rent Charges</h3>
        <div className="mt-3 space-y-4">
          {charges.map((charge) => (
            <div key={charge.id} className="rounded-xl border border-black/10 p-3 dark:border-white/15">
              <p className="text-sm font-semibold">
                Room {charge.rooms.room_number} | {charge.charge_month.slice(0, 7)} | Total ₹{charge.total_rent} | ₹{charge.per_tenant_amount} per tenant
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-mist dark:border-white/10">
                      <th className="py-2">Tenant</th><th>Paid</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charge.rent_payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-black/5 dark:border-white/5">
                        <td className="py-2">{payment.tenants.full_name}</td>
                        <td>₹{payment.paid_amount}</td>
                        <td>
                          <span
                            className={
                              payment.status === "paid"
                                ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"
                                : "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10"
                            }
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td>
                          {payment.status !== "paid" && (
                            <button
                              className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20"
                              onClick={() => markPaid(payment, charge.per_tenant_amount)}
                            >
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
          {!charges.length && <p className="text-sm text-mist">No rent charges yet.</p>}
        </div>
      </Card>
    </main>
  );
}
