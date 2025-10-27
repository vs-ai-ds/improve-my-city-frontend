// File: src/lib/errors.ts
export function toErrorString(err: any): string {
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
