// File: src\main.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ToastProvider from "./components/toast/ToastProvider";
import { router } from "./router";
import "./index.css";
import { useAuth } from "./store/useAuth";
useAuth.getState().bootstrap(); 

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </QueryClientProvider>
);