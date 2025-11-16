// src/lib/requireAuthAndOpenReport.ts
import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";

export function requireAuthAndOpenReport() {
  const { user } = useAuth.getState();
  if (user) {
    useReportModal.getState().openWith();
  } else {
    // your AuthModal listens to this (or open your auth flow directly)
    window.dispatchEvent(new CustomEvent("imc:open-auth", { detail: { view: "login" } }));
  }
}