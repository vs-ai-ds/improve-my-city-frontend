// File: src/components/ChatMini.tsx
import { useState } from "react";
import { api } from "../services/apiClient";

export default function ChatMini(){
  const [q,setQ]=useState(""); const [a,setA]=useState<string|undefined>();
  async function ask(){
    const { data } = await api.post("/bot/ask", { q });
    setA(data?.answer);
  }
  return (
    <div className="fixed bottom-5 left-5 z-40 rounded-2xl border bg-white/90 backdrop-blur p-3 shadow">
      <div className="text-xs font-semibold mb-1">Ask PlanPal</div>
      <div className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Status of #123?"
          className="rounded-xl border p-2 text-sm w-48"/>
        <button onClick={ask} className="rounded-xl bg-indigo-600 text-white px-3 text-sm">Ask</button>
      </div>
      {a && <div className="mt-2 text-sm">{a}</div>}
    </div>
  );
}