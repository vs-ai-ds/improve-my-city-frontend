// src/services/push.ts
export async function registerPush(swUrl = "/sw.js") {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.register(swUrl);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  });
  // use same base URL and bearer from localStorage
  const base = import.meta.env.VITE_API_BASE_URL;
  await fetch(`${base}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
    },
    body: JSON.stringify(sub),
  });
}