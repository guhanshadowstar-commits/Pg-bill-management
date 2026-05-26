"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Room = {
  id: string;
  room_number: string;
  sharing_type: number;
  meter_number: string | null;
  status: "active" | "inactive";
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ room_number: "", sharing_type: 4, meter_number: "" });

  async function loadRooms() {
    const data = await fetch("/api/rooms").then((r) => r.json());
    setRooms(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function addRoom() {
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_number: form.room_number,
        sharing_type: form.sharing_type,
        meter_number: form.meter_number || null,
        status: "active"
      })
    });

    setForm({ room_number: "", sharing_type: 4, meter_number: "" });
    await loadRooms();
  }

  async function toggle(room: Room) {
    await fetch(`/api/rooms/${room.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: room.status === "active" ? "inactive" : "active" })
    });
    await loadRooms();
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Add Room</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input placeholder="Room Number" value={form.room_number} onChange={(e) => setForm((p) => ({ ...p, room_number: e.target.value }))} />
          <Input type="number" placeholder="Sharing Type" value={form.sharing_type} onChange={(e) => setForm((p) => ({ ...p, sharing_type: Number(e.target.value) }))} />
          <Input placeholder="Meter Number" value={form.meter_number} onChange={(e) => setForm((p) => ({ ...p, meter_number: e.target.value }))} />
          <Button onClick={addRoom} disabled={!form.room_number}>Add Room</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Rooms</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Room</th>
                <th>Sharing</th>
                <th>Meter</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{room.room_number}</td>
                  <td>{room.sharing_type}-sharing</td>
                  <td>{room.meter_number || "-"}</td>
                  <td>{room.status}</td>
                  <td>
                    <button onClick={() => toggle(room)} className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20">Toggle</button>
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
