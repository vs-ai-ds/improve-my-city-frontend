// File: src/lib/errors.ts
export function toErrorString(err: any): string {
  if (err?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (err?.response?.status === 403) {
    const detail = err?.response?.data?.detail;
    if (detail === "user_inactive") {
      return "Your account has been deactivated. Please contact support.";
    }
    if (detail?.toLowerCase().includes("verify")) {
      return "Please verify your email to continue. Check your inbox for the verification link.";
    }
    return detail || "Access denied. You don't have permission to perform this action.";
  }
  
  // Axios-style error object
  const d = err?.response?.data;
  const detail = d?.detail ?? d?.message ?? d;
  if (!detail) return "Something went wrong";

  if (typeof detail === "string") return detail;

  // FastAPI validation -->
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((e) => (typeof e?.msg === "string" ? e.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
  }

  try { return JSON.stringify(detail); } catch { return "Request failed"; }
}
