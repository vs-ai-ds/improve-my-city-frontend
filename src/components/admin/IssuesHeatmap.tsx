import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "../../lib/loadGoogle";
import { api } from "../../services/apiClient";

export default function IssuesHeatmap({ range }: { range: string }) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadGoogleMaps();
      if (!mounted || !divRef.current) return;

      const center = { lat: 20.5937, lng: 78.9629 };
      const map = new google.maps.Map(divRef.current, {
        center,
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      try {
        const { data } = await api.get("/issues", { params: { limit: 1000, date_range: range } });
        const issues = Array.isArray(data) ? data : (data?.items || []);
        
        const points = issues
          .filter((issue: any) => issue.lat && issue.lng)
          .map((issue: any) => ({
            location: new google.maps.LatLng(issue.lat, issue.lng),
            weight: 1,
          }));

        if (points.length > 0 && (window as any).google?.maps?.visualization) {
          const heatmap = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: map,
            radius: 20,
            opacity: 0.6,
          });
          heatmapRef.current = heatmap;

          const bounds = new google.maps.LatLngBounds();
          points.forEach((p: any) => bounds.extend(p.location));
          if (points.length > 0) {
            map.fitBounds(bounds);
          }
        }
      } catch (error) {
        // Silently handle error - heatmap is non-critical
      }
    })();

    return () => {
      mounted = false;
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [range]);

  return (
    <div className="relative">
      <div ref={divRef} className="h-64 w-full rounded-xl border" />
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-50"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

