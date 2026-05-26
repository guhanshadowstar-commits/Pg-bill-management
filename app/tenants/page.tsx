"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Tenant = { id: string; full_name: string; phone: string | null; payment_status: string };
type Room = { id: string; room_number: string };
type Occupancy = { id: string; check_in: string; check_out: string | null; rooms: { room_number: string }; tenants: { full_name: string } };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [occupancy, setOccupancy] = useState<Occupancy[]>([]);

  const [tenantForm, setTenantForm] = useState({ full_name: "", phone: "" });
  const [assign, setAssign] = useState({ room_id: "", tenant_id: "", check_in: "", check_out: "" });

  async function load() {
    const [t, r, o] = await Promise.all([
      fetch("/api/tenants").then((x) => x.json()),
      fetch("/api/rooms").then((x) => x.json()),
      fetch("/api/occupancy").then((x) => x.json())
    ]);

    setTenants(t || []);
    setRooms(r || []);
    setOccupancy(o || []);

    if (r?.[0] && !assign.room_id) setAssign((p) => ({ ...p, room_id: r[0].id }));
    if (t?.[0] && !assign.tenant_id) setAssign((p) => ({ ...p, tenant_id: t[0].id }));
  }

  useEffect(() => {
    load();
  }, []);

  async function addTenant() {
    await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: tenantForm.full_name, phone: tenantForm.phone || null })
    });

    setTenantForm({ full_name: "", phone: "" });
    await load();
  }

  async function saveOccupancy() {
    await fetch("/api/occupancy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: assign.room_id,
        tenant_id: assign.tenant_id,
        check_in: assign.check_in,
        check_out: assign.check_out || null
      })
    });

    setAssign((p) => ({ ...p, check_in: "", check_out: "" }));
    await load();
  }

  async function del(id: string) {
    await fetch(`/api/occupancy/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Add Tenant</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input placeholder="Full Name" value={tenantForm.full_name} onChange={(e) => setTenantForm((p) => ({ ...p, full_name: e.target.value }))} />
          <Input placeholder="Phone" value={tenantForm.phone} onChange={(e) => setTenantForm((p) => ({ ...p, phone: e.target.value }))} />
          <Button onClick={addTenant} disabled={!tenantForm.full_name}>Add Tenant</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Assign Tenant</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <Select value={assign.room_id} onChange={(e) => setAssign((p) => ({ ...p, room_id: e.target.value }))}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>Room {r.room_number}</option>
            ))}
          </Select>
          <Select value={assign.tenant_id} onChange={(e) => setAssign((p) => ({ ...p, tenant_id: e.target.value }))}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
          <Input type="date" value={assign.check_in} onChange={(e) => setAssign((p) => ({ ...p, check_in: e.target.value }))} />
          <Input type="date" value={assign.check_out} onChange={(e) => setAssign((p) => ({ ...p, check_out: e.target.value }))} />
          <Button onClick={saveOccupancy} disabled={!assign.room_id || !assign.tenant_id || !assign.check_in}>Save</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Occupancy Logs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Tenant</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.map((o) => (
                <tr key={o.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{o.tenants.full_name}</td>
                  <td>{o.rooms.room_number}</td>
                  <td>{o.check_in}</td>
                  <td>{o.check_out || "Active"}</td>
                  <td><button onClick={() => del(o.id)} className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
