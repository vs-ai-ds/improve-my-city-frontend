// File: src\pages\VerifyEmailPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useEffect, useState } from "react";
import { verifyEmail } from "../services/auth.api";
import { useSearchParams } from "react-router-dom";

export default function VerifyEmailPage() {
  const [params]=useSearchParams(); const token = params.get("token") || "";
  const [msg,setMsg]=useState("Verifying…");
  useEffect(()=>{
    async function run(){
      try { await verifyEmail(token); setMsg("Email verified! You can close this tab."); }
      catch { setMsg("Verification failed or link expired."); }
    }
    if(token) run(); else setMsg("Missing token");
  },[token]);
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-black/5 p-6">
      <h2 className="text-xl font-semibold mb-2">Verify Email</h2>
      <p className="text-sm text-gray-700">{msg}</p>
    </div>
  );
}