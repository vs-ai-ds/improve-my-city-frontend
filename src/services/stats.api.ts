// File: src/services/stats.api.ts

import { api } from "./apiClient";

/** need on place for these --- backend */
export type RangeKey = "today" | "7d" | "15d" | "30d" | "all";

const BASE = "/issues/stats";

export async function getSummary(range: RangeKey) {
  const { data } = await api.get(`${BASE}`, { params: { range } });
  return data;
}

export async function getByType(range: RangeKey) {
  const { data } = await api.get(`${BASE}/by-type`, { params: { range } });
  return data;
}

export async function getByState(range: RangeKey) {
  const { data } = await api.get(`${BASE}/by-state`, { params: { range } });
  return data;
}