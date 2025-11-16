// File: src\services\apiClient.ts

import axios from "axios";
import { useAuth } from "../store/useAuth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,    
  withCredentials: false,
  headers: { "Accept": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      const { logout } = useAuth.getState();
      logout();
      // Redirect to home if not already there
      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);
