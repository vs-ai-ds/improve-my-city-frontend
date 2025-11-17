import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "../../lib/loadGoogle";

export default function MapPicker({
  initialLat, initialLng,
  onPick,
}: {
  initialLat?: number; initialLng?: number;
  onPick: (p: { lat: number; lng: number; address?: string }) => void;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadGoogleMaps();
      if (!mounted || !divRef.current) return;

      const center = (typeof initialLat === "number" && typeof initialLng === "number")
        ? { lat: initialLat, lng: initialLng }
        : { lat: 28.6139, lng: 77.2090 }; // New Delhi default

      const map = new google.maps.Map(divRef.current, { 
        center, 
        zoom: 6, 
        mapTypeControl: false, 
        streetViewControl: false 
      });
      mapRef.current = map;

      let marker: any = null;
      if (google.maps.marker && (google.maps.marker as any).AdvancedMarkerElement) {
        try {
          const { AdvancedMarkerElement } = google.maps.marker as any;
          marker = new AdvancedMarkerElement({ map, position: center });
        } catch (e) {
          marker = new google.maps.Marker({ map, position: center });
        }
      } else {
        marker = new google.maps.Marker({ map, position: center });
      }
      markerRef.current = marker;

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search for a place in India...";
      searchInput.style.cssText = "box-sizing:border-box;border:1px solid transparent;width:240px;height:32px;padding:0 12px;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:14px;outline:none;text-overflow:ellipses;position:absolute;top:10px;left:50%;margin-left:-120px;z-index:1000;";
      divRef.current!.appendChild(searchInput);
      searchInputRef.current = searchInput;
      
      const searchBox = new google.maps.places.SearchBox(searchInput);
      searchBoxRef.current = searchBox;
      
      // Bias search results to India
      searchBox.setBounds(new google.maps.LatLngBounds(
        new google.maps.LatLng(6.5, 68.1), // Southwest corner
        new google.maps.LatLng(37.6, 97.4) // Northeast corner
      ));

      // Listen for place selection in search box
      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;
        const place = places[0];
        if (!place.geometry || !place.geometry.location) return;
        
        const p = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        if (markerRef.current) {
          if (markerRef.current.setPosition) {
            markerRef.current.setPosition(p);
          } else {
            markerRef.current.position = p;
          }
        }
        map.panTo(p);
        map.setZoom(16);
        onPick({ ...p, address: place.formatted_address || place.name });
      });

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        if (markerRef.current) {
          if (markerRef.current.setPosition) {
            markerRef.current.setPosition(p);
          } else {
            markerRef.current.position = p;
          }
        }
        map.panTo(p); 
        map.setZoom(16);
        onPick(p);
        // Reverse geocode to get address
        new google.maps.Geocoder().geocode({ location: p }, (res: google.maps.GeocoderResult[], status: string) => {
          if (status === "OK" && res && res[0]) onPick({ ...p, address: res[0].formatted_address });
        });
      });
    })();
    return () => { 
      mounted = false;
      if (searchInputRef.current && searchInputRef.current.parentNode) {
        searchInputRef.current.parentNode.removeChild(searchInputRef.current);
      }
    };
  }, []);

  // reflect props change (e.g., address autocomplete → new coords)
  useEffect(() => {
    if (mapRef.current && markerRef.current && typeof initialLat === "number" && typeof initialLng === "number") {
      const p = { lat: initialLat, lng: initialLng };
      markerRef.current.position = p as any;
      mapRef.current.panTo(p); 
      mapRef.current.setZoom(16);
    }
  }, [initialLat, initialLng]);

  return (
    <div className="relative">
      <div ref={divRef} className="h-64 w-full rounded-xl border" />
    </div>
  );
}