// File: src\services\issues.api.ts
// Project: improve-my-city-frontend
// Auto-added for reference

import { api } from "./apiClient";

export interface Issue {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  category: string;
  state_code: string;
  country: string;
  lat: number;
  lng: number;
  created_at: string;
  created_by_email?: string;
}

export async function listIssues(params: Record<string, any>) {
  const { data } = await api.get("/issues", { params });
  return data;
}

export async function createIssue(form: FormData) {
  const { data } = await api.post("/issues", form, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export async function getIssue(id: number) {
  const { data } = await api.get(`/issues/${id}`);
  return data as Issue;
}

export async function updateIssueStatus(id: number, status: Issue["status"]) {
  const { data } = await api.patch(`/issues/${id}/status`, { status });
  return data;
}

export async function assignIssue(id: number, userId: number) {
  const { data } = await api.patch(`/issues/${id}`, { assigned_to_id: userId });
  return data;
}


export async function listIssueComments(id: number) {
  const { data } = await api.get(`/issues/${id}/comments`);
  return data;
}

export async function addIssueComment(id: number, payload: { body: string }) {
  const { data } = await api.post(`/issues/${id}/comments`, payload);
  return data;
}
