// File: src/services/stats.api.ts

import { api } from "./apiClient";

/** need on place for these --- backend */
export type RangeKey = "today" | "7d" | "15d" | "30d" | "all";

const BASE = "/issues/stats";

export async function getSummary(range: RangeKey) {
  const { data } = await api.get(`${BASE}/summary`, { params: { range } });
  return data;
}

export async function getByType(range: RangeKey): Promise<Array<{ type: string; count: number }>> {
  const { data } = await api.get(`${BASE}/by-type`, { params: { range } });
  return data as Array<{ type: string; count: number }>;
}

export async function getByState(range: RangeKey): Promise<Array<{ state_code?: string; state?: string; count?: number }>> {
  const { data } = await api.get(`${BASE}/by-state`, { params: { range } });
  return data as Array<{ state_code?: string; state?: string; count?: number }>;
}