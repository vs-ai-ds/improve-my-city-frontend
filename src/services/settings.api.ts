// File: src\services\settings.api.ts
// Project: improve-my-city-frontend
// Auto-added for reference

import { api } from "./apiClient";

export async function getPublicSettings() {
  const { data } = await api.get("/public/settings");
  return data;
}

export async function getAdminSettings() {
  const { data } = await api.get("/admin/settings");
  return data;
}

export async function updateAdminSettings(payload: any) {
  const { data } = await api.put("/admin/settings", payload);
  return data;
}