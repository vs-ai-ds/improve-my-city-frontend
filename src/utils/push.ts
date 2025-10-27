// File: src\utils\push.ts
// Project: improve-my-city-frontend
// Auto-added for reference

export async function enablePush() {
  if (!("serviceWorker" in navigator)) throw new Error("SW not supported");
  const reg = await navigator.serviceWorker.register("/sw.js");
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY) });
  return { endpoint: sub.endpoint, keys: (sub as any).toJSON().keys };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}