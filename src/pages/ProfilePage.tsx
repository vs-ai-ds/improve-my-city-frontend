// File: src/pages/ProfilePage.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../store/useAuth";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api } from "../services/apiClient";
import IssueCard from "../components/IssueCard";

async function getMe() { const { data } = await api.get("/auth/me"); return data; }
async function fetchMine() { const { data } = await api.get("/issues?mine_only=1"); return data; }
async function updateProfile(body: { name: string; mobile?: string | null }) { const { data } = await api.put("/auth/profile", body); return data; }

export default function ProfilePage() {
  const { refreshMe } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["auth-me"], queryFn: getMe, refetchOnWindowFocus: false });
  const mine = useQuery({ queryKey: ["my-issues"], queryFn: fetchMine, refetchOnWindowFocus: false });

  const [name, setName] = useState(""); const [mobile, setMobile] = useState("");
  useEffect(() => { if (me.data) { setName(me.data.name || ""); setMobile(me.data.mobile || ""); } }, [me.data]);

  const mut = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), mobile: mobile.trim() || null }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["auth-me"] }); await refreshMe(); },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="rounded-2xl border bg-white p-4">
        <h1 className="text-xl font-semibold">Your profile</h1>
        <div className="mt-4 grid gap-3 max-w-md">
          <div><label className="text-sm">Full name <span className="text-red-600">*</span></label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" required />
          </div>
          <div><label className="text-sm">Mobile</label>
            <Input value={mobile} onChange={(e)=>setMobile(e.target.value)} placeholder="+91…" />
          </div>
          <div><label className="text-sm">Email</label>
            <Input value={me.data?.email ?? ""} disabled />
          </div>
          <div className="pt-2">
            <Button onClick={()=>mut.mutate()} disabled={mut.isPending || name.trim().length<2}>
              {mut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Your issues</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          {Array.isArray(mine.data) && mine.data.length
            ? mine.data.map((it:any) => <IssueCard key={it.id} issue={it} />)
            : <div className="text-sm text-gray-600">No issues yet.</div>}
        </div>
      </div>
    </div>
  );
}