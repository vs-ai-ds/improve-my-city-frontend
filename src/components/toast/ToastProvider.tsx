// File: src\components\toast\ToastProvider.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type Toast = { id: number; title?: string; message: string; timeoutMs?: number };
type Ctx = { show: (message: string, opts?: { title?: string; timeoutMs?: number }) => void };

const ToastCtx = createContext<Ctx | null>(null);

// ✅ Named export
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, opts?: { title?: string; timeoutMs?: number }) => {
    const id = Date.now() + Math.random();
    const timeoutMs = opts?.timeoutMs ?? 3500;
    setToasts((t) => [...t, { id, title: opts?.title, message, timeoutMs }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeoutMs);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-end p-4 gap-3">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto w-full max-w-md rounded-xl bg-indigo-600 text-white shadow-2xl ring-2 ring-indigo-400 p-4 animate-in slide-in-from-right">
              {t.title && <div className="text-base font-bold mb-1">{t.title}</div>}
              <div className="text-base font-medium">{t.message}</div>
              <div className="mt-3 h-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ animation: `toastProgress ${t.timeoutMs ?? 3500}ms linear forwards`, width: "0%" }} />
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

// ✅ Default export
export default ToastProvider;
