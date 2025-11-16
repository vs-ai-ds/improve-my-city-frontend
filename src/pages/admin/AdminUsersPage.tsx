// File: src/pages/admin/AdminUsersPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { listUsers, createUser, updateUser, deleteUser } from "../../services/admin.users.api";

export default function AdminUsersPage(){
  const qc = useQueryClient();
  const [q,setQ]=useState(""); const debouncedQ = q; // keep simple; can add debounce later
  const users = useQuery({ queryKey:["admin-users",debouncedQ], queryFn:()=>listUsers(debouncedQ) });
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [role,setRole]=useState("citizen");

  const mutCreate = useMutation({ mutationFn:()=>createUser({name:name.trim(), email:email.trim().toLowerCase(), role}), onSuccess:()=>{ setName(""); setEmail(""); setRole("citizen"); qc.invalidateQueries({queryKey:["admin-users"]}); }});
  const mutUpdate = useMutation({ mutationFn:(p:{id:number;body:any})=>updateUser(p.id,p.body), onSuccess:()=>qc.invalidateQueries({queryKey:["admin-users"]}) });
  const mutDelete = useMutation({ mutationFn:(id:number)=>deleteUser(id), onSuccess:()=>qc.invalidateQueries({queryKey:["admin-users"]}) });

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm">Search</label>
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Name or email" />
        </div>
        <div className="ml-auto" />
        <div>
          <label className="text-sm">Name</label>
          <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div>
          <label className="text-sm">Role</label>
          <select className="mt-1 rounded-xl border p-2" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="citizen">Citizen</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <Button onClick={()=>mutCreate.mutate()} disabled={mutCreate.isPending || name.trim().length<2 || !email.includes("@")}>
          {mutCreate.isPending? "Creating…" : "Create user"}
        </Button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Verified</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users.data) && users.data.length ? users.data.map((u:any)=>(
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 pr-3">{u.name || "—"}</td>
                <td className="py-2 pr-3">{u.email}</td>
                <td className="py-2 pr-3">
                  <select className="rounded-xl border p-1" value={u.role} onChange={(e)=>mutUpdate.mutate({id:u.id, body:{role:e.target.value}})}>
                    <option value="citizen">Citizen</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={u.is_active} onChange={(e)=>mutUpdate.mutate({id:u.id, body:{is_active:e.target.checked}})} />
                </td>
                <td className="py-2 pr-3">{u.is_verified ? "Yes" : "No"}</td>
                <td className="py-2 pr-3">
                  <button className="text-red-600 hover:underline" onClick={()=>mutDelete.mutate(u.id)}>Delete</button>
                </td>
              </tr>
            )):(
              <tr><td className="py-3 text-gray-600" colSpan={6}>No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}