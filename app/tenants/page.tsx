"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Tenant = { id: string; full_name: string; phone: string | null; payment_status: string };
type Room = { id: string; room_number: string };
type Occupancy = { id: string; check_in: string; check_out: string | null; rooms: { room_number: string }; tenants: { full_name: string } };
type Bed = { id: string; room_id: string; bed_label: string; status: "vacant" | "occupied" | "reserved" | "maintenance" };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [occupancy, setOccupancy] = useState<Occupancy[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  const [tenantForm, setTenantForm] = useState({ full_name: "", phone: "" });
  const [assign, setAssign] = useState({ room_id: "", tenant_id: "", bed_id: "", check_in: "", check_out: "", meter_reading: "" });

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

  async function loadBedsForRoom(roomId: string) {
    if (!roomId) {
      setBeds([]);
      return;
    }
    const data = await fetch(`/api/beds?room_id=${roomId}`).then((x) => x.json());
    setBeds(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadBedsForRoom(assign.room_id);
    setAssign((p) => ({ ...p, bed_id: "" }));
  }, [assign.room_id]);

  const vacantBeds = beds.filter((bed) => bed.status === "vacant");

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
        bed_id: assign.bed_id,
        check_in: assign.check_in,
        check_out: assign.check_out || null,
        meter_reading: Number(assign.meter_reading)
      })
    });

    setAssign((p) => ({ ...p, bed_id: "", check_in: "", check_out: "", meter_reading: "" }));
    await load();
  }

  async function checkout(id: string, currentCheckOut: string | null) {
    const fallback = currentCheckOut || new Date().toISOString().slice(0, 10);
    const checkOut = window.prompt("Enter checkout date (YYYY-MM-DD). Leave blank to make active again.", fallback);
    if (checkOut === null) return;

    const cleaned = checkOut.trim();
    let meterReading: number | undefined;
    if (cleaned) {
      const readingInput = window.prompt("Room meter reading at check-out");
      if (readingInput === null) return;
      meterReading = Number(readingInput.trim());
      if (!Number.isFinite(meterReading)) {
        window.alert("A valid meter reading is required to check out.");
        return;
      }
    }

    await fetch(`/api/occupancy/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check_out: cleaned || null, ...(cleaned ? { meter_reading: meterReading } : {}) })
    });
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
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
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
          <Select value={assign.bed_id} onChange={(e) => setAssign((p) => ({ ...p, bed_id: e.target.value }))}>
            <option value="">Select bed</option>
            {vacantBeds.map((bed) => (
              <option key={bed.id} value={bed.id}>{bed.bed_label}</option>
            ))}
          </Select>
          <Input type="date" value={assign.check_in} onChange={(e) => setAssign((p) => ({ ...p, check_in: e.target.value }))} />
          <Input
            type="number"
            placeholder="Room meter reading at check-in"
            value={assign.meter_reading}
            onChange={(e) => setAssign((p) => ({ ...p, meter_reading: e.target.value }))}
          />
          <Button
            onClick={saveOccupancy}
            disabled={!assign.room_id || !assign.tenant_id || !assign.bed_id || !assign.check_in || !assign.meter_reading}
          >
            Save
          </Button>
        </div>
        {!vacantBeds.length && assign.room_id && (
          <p className="mt-2 text-xs text-mist">No vacant beds in this room. Add or free up a bed first.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Occupancy Logs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Tenant</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.map((o) => (
                <tr key={o.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{o.tenants.full_name}</td>
                  <td>{o.rooms.room_number}</td>
                  <td>{o.check_in}</td>
                  <td>{o.check_out || "Active"}</td>
                  <td>
                    <span className={o.check_out ? "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10" : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"}>
                      {o.check_out ? "Checked out" : "Active"}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => checkout(o.id, o.check_out)} className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20">
                      {o.check_out ? "Edit checkout" : "Check out"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
