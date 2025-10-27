// File: src\pages\ResetPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { reset } from "../services/auth.api";

export default function ResetPage() {
  const [params]=useSearchParams(); const token = params.get("token") || "";
  const [password,setPassword]=useState(""); const [ok,setOk]=useState<string|null>(null);
  const [err,setErr]=useState<string|null>(null); const [busy,setBusy]=useState(false);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault(); setErr(null); setBusy(true);
    try { await reset(token, password); setOk("Password reset! You can now sign in."); }
    catch(e:any){ setErr(e?.response?.data?.detail || "Reset failed"); }
    finally{ setBusy(false); }
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-black/5 p-6">
      <h2 className="text-xl font-semibold">Reset password</h2>
      <form onSubmit={onSubmit} className="space-y-3 mt-3">
        <div className="space-y-2">
          <label className="text-sm">New password</label>
          <Input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {ok && <p className="text-sm text-green-700">{ok}</p>}
        <Button disabled={busy}>{busy?"Updating…":"Update password"}</Button>
      </form>
    </div>
  );
}