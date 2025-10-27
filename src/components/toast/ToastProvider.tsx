// File: src\components\toast\ToastProvider.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
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
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col items-end p-4 gap-2">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-black/10 p-3">
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              <div className="text-sm text-gray-800">{t.message}</div>
              <div className="mt-2 h-0.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600" style={{ animation: `toastProgress ${t.timeoutMs ?? 3500}ms linear forwards` }} />
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
