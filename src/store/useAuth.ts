// File: src/store/useAuth.ts
import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { api } from "../services/apiClient";

type Role = "citizen" | "staff" | "admin" | "super_admin";
type User = { id?: number; email: string; role: Role; is_verified?: boolean; is_active?: boolean; name?: string | null; mobile?: string | null };
type TokenPair = { access_token: string; refresh_token?: string };

function setAuthHeader(t?: string) {
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
  else delete api.defaults.headers.common.Authorization;
}

async function fetchMe(): Promise<User | null> {
  try { const { data } = await api.get("/auth/me"); return data as User; } catch { return null; }
}
function decodeUser(t: string): User | null {
  try { const p = jwtDecode<any>(t); const email = p?.sub || p?.email; const role = (p?.role as Role) || "citizen"; if (!email) return null; return { email, role }; } catch { return null; }
}

export const useAuth = create<{
  user: User | null;
  persist: (t: TokenPair) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  refreshMe: () => Promise<void>;
}>()((set, get) => ({
  user: null,

  persist: async (t) => {
    localStorage.setItem("access_token", t.access_token);
    if (t.refresh_token) localStorage.setItem("refresh_token", t.refresh_token);
    setAuthHeader(t.access_token);
    // force real /auth/me so name shows
    const u = (await fetchMe()) ?? decodeUser(t.access_token);
    if (u) set({ user: u });
  },

  logout: () => {
    localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token");
    setAuthHeader(undefined); set({ user: null });
  },

  bootstrap: async () => {
    const tok = localStorage.getItem("access_token"); if (!tok) return;
    setAuthHeader(tok);
    const u = (await fetchMe()) ?? decodeUser(tok);
    if (u) set({ user: u });
  },

  refreshMe: async () => {
    const u = await fetchMe();
    if (u) set({ user: u });
  },
}));