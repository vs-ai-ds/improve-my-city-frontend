// src/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../store/useAuth";
import { updateProfile } from "../services/auth.api"; // adjust if named differently
import { nameOk, mobileOk } from "../lib/validators"; // add mobileOk below if you don't have it

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setMobile(user?.mobile ?? "");
  }, [user]);

  const valid = useMemo(() => {
    const n = name.trim();
    const m = mobile.trim();
    const nameValid = nameOk(n);
    const mobileValid = !m || mobileOk(m);
    return nameValid && mobileValid;
  }, [name, mobile]);

  const dirty = useMemo(() => {
    return (name ?? "") !== (user?.name ?? "") || (mobile ?? "") !== (user?.mobile ?? "");
  }, [name, mobile, user]);

  async function save() {
    if (!dirty || !valid) return;
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), mobile: mobile.trim() || null });
      await refreshMe();
      alert("Profile updated");
    } catch (e) {
      alert("Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="mt-4 rounded-2xl border bg-white p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input value={user?.email ?? ""} disabled className="mt-1 w-full rounded-xl border px-3 py-2 bg-gray-50 text-gray-600" />
        </div>

        <div>
          <label className="block text-sm font-medium">Name<span className="text-red-600">*</span></label>
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
          {!nameOk(name) && <div className="mt-1 text-xs text-red-600">Min 2 chars; letters/spaces/hyphen/’ only.</div>}
        </div>

        <div>
          <label className="block text-sm font-medium">Mobile</label>
          <input
            value={mobile}
            onChange={(e)=>setMobile(e.target.value)}
            placeholder="+91 98765 43210"
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
          {!!mobile && !mobileOk(mobile) && <div className="mt-1 text-xs text-red-600">Enter a valid mobile number.</div>}
        </div>

        <div className="flex items-center justify-end">
          <button onClick={save} disabled={!dirty || !valid || busy} className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">
            {busy ? "…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}