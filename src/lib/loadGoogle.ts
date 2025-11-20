// File: src/lib/loadGoogle.ts
let loading: Promise<void> | null = null;
export function loadGoogleMaps() {
  if ((window as any).google?.maps) return Promise.resolve();
  if (loading) return loading;
  const key = import.meta.env.VITE_MAPS_API_KEY;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,visualization`;
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loading;
}
