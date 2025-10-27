// File: src\services\apiClient.ts
// Project: improve-my-city-frontend
// Auto-added for reference

import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,    
  withCredentials: false,
  headers: { "Accept": "application/json" },
});

// api.interceptors.request.use((config) => { return config; });
