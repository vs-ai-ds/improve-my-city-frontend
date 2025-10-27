// File: src\pages\ReportPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createIssue } from "../services/issues.api";

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("roads");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [ok, setOk] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: createIssue,
    onSuccess: (d) => setOk(`Created #${d.id}`),
    onError: () => setOk("Failed to create"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate({ title, category, description, lat, lng });
      }}
      className="max-w-xl space-y-3"
    >
      <h2 className="text-xl font-semibold">Report an issue</h2>
      <input className="w-full rounded border p-2" placeholder="Title" value={title}
             onChange={(e) => setTitle(e.target.value)} required minLength={3} />
      <select className="w-full rounded border p-2" value={category} onChange={(e)=>setCategory(e.target.value)}>
        <option value="roads">Roads</option>
        <option value="streetlight">Streetlight</option>
        <option value="garbage">Garbage</option>
      </select>
      <textarea className="w-full rounded border p-2" placeholder="Description (optional)"
                value={description} onChange={(e)=>setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Latitude" value={lat ?? ""} onChange={(e)=>setLat(e.target.value ? parseFloat(e.target.value) : undefined)} />
        <input className="rounded border p-2" placeholder="Longitude" value={lng ?? ""} onChange={(e)=>setLng(e.target.value ? parseFloat(e.target.value) : undefined)} />
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={mut.isPending}>
        {mut.isPending ? "Submitting…" : "Submit"}
      </button>
      {ok && <p className="text-sm mt-2">{ok}</p>}
    </form>
  );
}