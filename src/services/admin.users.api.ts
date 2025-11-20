import { api } from "./apiClient";

export async function listUsers(params?: {
  q?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}) {
  const { data } = await api.get("/admin/users", { params: params || {} });
  return data;
}

export async function createUser(body: { name: string; email: string; role: string }) {
  const { data } = await api.post("/admin/users", body);
  return data;
}

export async function updateUser(id: number, body: { role?: string; is_active?: boolean }) {
  const { data } = await api.put(`/admin/users/${id}`, body);
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function triggerPasswordReset(userId: number) {
  const { data } = await api.post(`/admin/users/${userId}/reset-password`);
  return data;
}

export async function getUserStats(userId: number) {
  const { data } = await api.get(`/admin/users/${userId}/stats`);
  return data;
}

export async function bulkUserOperation(payload: { user_ids: number[]; operation: string }) {
  const { data } = await api.post("/admin/users/bulk", payload);
  return data;
}