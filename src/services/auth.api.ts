// File: src\services\auth.api.ts
// Project: improve-my-city-frontend
// Auto-added for reference

// File: src/services/auth.api.ts
import { api } from "./apiClient";

export type LoginIn = { email: string; password: string };
export type RegisterIn = { name?: string; email: string; password: string; mobile?: string };
export type EmailOnly = { email: string };

export async function me() { const { data } = await api.get("/auth/me"); return data; }

export async function login(body: LoginIn) {
  const { data } = await api.post("/auth/login", body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function register(body: RegisterIn) {
  const { data } = await api.post("/auth/register", body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function forgot(body: EmailOnly) {
  const { data } = await api.post("/auth/forgot", body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function sendVerify(email: string) {
  const { data } = await api.post("/auth/send-verify", null, {
    params: { email },
  });
  return data;
}

export async function verifyCode(email: string, code: string) {
  const { data } = await api.post("/auth/verify-code", null, {
    params: { email, code },
  });
  return data;
}