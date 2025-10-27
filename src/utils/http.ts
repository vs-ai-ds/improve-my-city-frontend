// File: src\utils\http.ts
// Project: improve-my-city-frontend
// Auto-added for reference

type FastAPIDetail =
  | string
  | { msg?: string; detail?: string; error?: string }
  | Array<{ msg?: string; detail?: string; loc?: any; type?: string; ctx?: any }>;

export function getErrorMessage(err: any, fallback = "Something went wrong"): string {
  // Axios error?
  const res = err?.response;
  const data = res?.data;

  // Common shapes
  const detail: FastAPIDetail = data?.detail ?? data?.message ?? data?.error ?? data;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    // Pydantic v2 style: [{loc:..., msg: "...", type: "..."}]
    const first = detail.find((d) => d?.msg) || detail[0];
    if (first?.msg) return first.msg;
    // fallback stringify just in case
    try { return JSON.stringify(detail[0]); } catch { /* pass */ }
  }

  if (detail && typeof detail === "object") {
    const msg = (detail as any).msg || (detail as any).detail || (detail as any).error;
    if (msg && typeof msg === "string") return msg;
    try { return JSON.stringify(detail); } catch { /* pass */ }
  }

  // Nothing worked
  return res?.statusText || fallback;
}