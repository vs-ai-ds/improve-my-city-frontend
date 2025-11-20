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
  state_code?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  updated_at?: string | null;
  created_by_email?: string;
  address?: string;
  photos?: string[];
  creator_name?: string;
  creator_email?: string;
  creator?: { name?: string; email?: string };
  assigned_to_id?: number | null;
  assigned_to?: { id: number; name?: string; email?: string; role?: string } | null;
}

export async function listIssues(params: Record<string, any>) {
  const queryParams: Record<string, any> = { ...params };
  if (queryParams.dateRange && queryParams.dateRange !== "all_time") {
    queryParams.date_range = queryParams.dateRange;
    delete queryParams.dateRange;
  }
  if (queryParams.categoryId && queryParams.categoryId !== "all") {
    queryParams.category = queryParams.categoryId;
    delete queryParams.categoryId;
  }
  if (queryParams.regionId && queryParams.regionId !== "all") {
    queryParams.state_code = queryParams.regionId;
    delete queryParams.regionId;
  }
  if (queryParams.status && queryParams.status === "all") {
    delete queryParams.status;
  }
  if (queryParams.myIssuesOnly !== undefined) {
    queryParams.mine_only = queryParams.myIssuesOnly ? 1 : 0;
    delete queryParams.myIssuesOnly;
  }
  if (queryParams.search) {
    queryParams.search = queryParams.search;
  }
  const { data } = await api.get("/issues", { params: queryParams });
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

export async function updateIssueStatus(id: number, status: Issue["status"], comment?: string) {
  const { data } = await api.patch(`/issues/${id}/status`, { status, comment });
  return data;
}

export async function assignIssue(id: number, userId: number | null) {
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

export async function getIssueActivity(id: number) {
  const { data } = await api.get(`/issues/${id}/activity`);
  return data;
}

export async function bulkIssueOperation(payload: { issue_ids: number[]; operation: string; user_id?: number | null; status?: string }) {
  const { data } = await api.post("/issues/bulk", payload);
  return data;
}

export async function getRelatedIssues(issueId: number) {
  const { data } = await api.get(`/issues/${issueId}/related`);
  return data;
}
