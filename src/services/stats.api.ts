// File: src/services/stats.api.ts

import { api } from "./apiClient";
import type { IssueFilters } from "../hooks/useIssueFilters";

export type RangeKey = "today" | "7d" | "15d" | "30d" | "all";

const BASE = "/issues/stats";

export async function getSummary(range: RangeKey) {
  const { data } = await api.get(`${BASE}/summary`, { params: { range } });
  return data;
}

export async function getByType(
  range: RangeKey,
  filters?: Partial<Pick<IssueFilters, "status" | "categoryId" | "regionId" | "myIssuesOnly">>,
  userId?: number
): Promise<Array<{ type: string; count: number }>> {
  const params: Record<string, any> = { range };
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.categoryId && filters.categoryId !== "all") params.category = filters.categoryId;
  if (filters?.regionId && filters.regionId !== "all") params.state_code = filters.regionId;
  if (filters?.myIssuesOnly && userId) {
    params.mine_only = 1;
    params.user_id = userId;
  }
  const { data } = await api.get(`${BASE}/by-type`, { params });
  return data as Array<{ type: string; count: number }>;
}

export async function getByTypeStatus(
  range: RangeKey,
  filters?: Partial<Pick<IssueFilters, "status" | "categoryId" | "regionId" | "myIssuesOnly">>,
  userId?: number
): Promise<Array<{ type: string; pending: number; in_progress: number; resolved: number }>> {
  const params: Record<string, any> = { range };
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.categoryId && filters.categoryId !== "all") params.category = filters.categoryId;
  if (filters?.regionId && filters.regionId !== "all") params.state_code = filters.regionId;
  if (filters?.myIssuesOnly && userId) {
    params.mine_only = 1;
    params.user_id = userId;
  }
  const { data } = await api.get(`${BASE}/by-type-status`, { params });
  return data as Array<{ type: string; pending: number; in_progress: number; resolved: number }>;
}

export async function getByState(
  range: RangeKey,
  filters?: Partial<Pick<IssueFilters, "status" | "categoryId" | "regionId" | "myIssuesOnly">>,
  userId?: number
): Promise<Array<{ state_code?: string; state?: string; count?: number }>> {
  const params: Record<string, any> = { range };
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.categoryId && filters.categoryId !== "all") params.category = filters.categoryId;
  if (filters?.regionId && filters.regionId !== "all") params.state_code = filters.regionId;
  if (filters?.myIssuesOnly && userId) {
    params.mine_only = 1;
    params.user_id = userId;
  }
  const { data } = await api.get(`${BASE}/by-state`, { params });
  return data as Array<{ state_code?: string; state?: string; count?: number }>;
}

export async function getByStateStatus(
  range: RangeKey,
  filters?: Partial<Pick<IssueFilters, "status" | "categoryId" | "regionId" | "myIssuesOnly">>,
  userId?: number
): Promise<Array<{ state_code: string; pending: number; in_progress: number; resolved: number }>> {
  const params: Record<string, any> = { range };
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.categoryId && filters.categoryId !== "all") params.category = filters.categoryId;
  if (filters?.regionId && filters.regionId !== "all") params.state_code = filters.regionId;
  if (filters?.myIssuesOnly && userId) {
    params.mine_only = 1;
    params.user_id = userId;
  }
  const { data } = await api.get(`${BASE}/by-state-status`, { params });
  return data as Array<{ state_code: string; pending: number; in_progress: number; resolved: number }>;
}