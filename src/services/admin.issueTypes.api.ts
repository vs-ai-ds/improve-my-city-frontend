// File: src\services\admin.issueTypes.api.ts
// Project: improve-my-city-frontend
// Auto-added for reference

import { api } from "./apiClient";

export async function listIssueTypes() { const { data } = await api.get("/admin/issue-types"); return data; }
export async function createIssueType(p: any) { const { data } = await api.post("/admin/issue-types", p); return data; }
export async function updateIssueType(id: number, p: any) { const { data } = await api.put(`/admin/issue-types/${id}`, p); return data; }
export async function deleteIssueType(id: number) { const { data } = await api.delete(`/admin/issue-types/${id}`); return data; }
export async function reorderIssueTypes(order: Record<string, number>) { const { data } = await api.post("/admin/issue-types/reorder", { order }); return data; }
export async function getIssueTypeStats(typeId: number) { const { data } = await api.get(`/admin/issue-types/${typeId}/stats`); return data; }