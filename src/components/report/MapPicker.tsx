// File: src/components/report/MapPicker.tsx
import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "../../lib/loadGoogle";

export default function MapPicker({
  initialLat, initialLng, onPick, onError,
}: {
  initialLat?: number; initialLng?: number;
  onPick: (p: { lat: number; lng: number; address?: string }) => void;
  onError?: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any, marker: any;
    (async () => {
      try {
        await loadGoogleMaps();
        const google = (window as any).google;
        const center = (typeof initialLat === "number" && typeof initialLng === "number")
          ? { lat: initialLat, lng: initialLng }
          : { lat: 21.0, lng: 78.0 }; // India center
        map = new google.maps.Map(ref.current, { center, zoom: 5, mapTypeControl: false, streetViewControl: false });
        const { AdvancedMarkerElement } = google.maps.marker;
        marker = new AdvancedMarkerElement({ map, position: center, title: "Selected location" });

        map.addListener("click", async (e: any) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.position = pos;
          onPick(pos);
          // optional: reverse geocode could be added here
        });
      } catch {
        onError?.("Failed to load map");
      }
    })();
    return () => { /* no-op */ };
  }, [initialLat, initialLng, onPick, onError]);

  return <div ref={ref} className="h-full w-full" />;
}