// File: src/services/admin.users.api.ts
import { api } from "./apiClient";
export async function listUsers(q?:string){ const {data}=await api.get("/admin/users", { params: q?{q}:undefined }); return data; }
export async function createUser(body:{name:string;email:string;role:string}){ const {data}=await api.post("/admin/users", body); return data; }
export async function updateUser(id:number, body:{role?:string;is_active?:boolean}){ const {data}=await api.put(`/admin/users/${id}`, body); return data; }
export async function deleteUser(id:number){ const {data}=await api.delete(`/admin/users/${id}`); return data; }