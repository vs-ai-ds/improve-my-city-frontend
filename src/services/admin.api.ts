// File: src\services\admin.api.ts
// Project: improve-my-city-frontend
// Auto-added for reference

import { api } from "./apiClient";

export async function getSettings() {
  const res = await api.get("/admin/settings");
  return res.data;
}
export async function updateSettings(payload: Partial<{
  allow_anonymous_reporting: boolean;
  allow_open_admin_registration: boolean;
  email_from_name: string;
  email_from_address: string;
}>) {
  const res = await api.put("/admin/settings", payload);
  return res.data;
}

export async function listIssueTypes() {
  const res = await api.get("/admin/issue-types");
  return res.data as {id:number;name:string;is_active:boolean}[];
}
export async function createIssueType(name: string) {
  const res = await api.post("/admin/issue-types", { name });
  return res.data;
}
export async function updateIssueType(id: number, patch: Partial<{name:string; is_active:boolean}>) {
  const res = await api.put(`/admin/issue-types/${id}`, patch);
  return res.data;
}