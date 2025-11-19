// File: src/services/apiClient.ts

import axios from "axios";
import { useAuth } from "../store/useAuth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  headers: { Accept: "application/json" },
});

// Attach access token if present
api.interceptors.request.use((config: any) => {
  const t =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const cfg: any = error.config || {};

    // If this request explicitly asked to skip global 401 handling, just reject
    if (cfg.skipAuthInterceptor) {
      return Promise.reject(error);
    }

    if (status === 401) {
      // Token expired or invalid - logout user
      const { logout } = useAuth.getState();
      logout();

      // Redirect to home if currently on /admin pages
      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);