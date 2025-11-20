declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: any);
      setCenter(latlng: any): void;
      panTo(latlng: any): void;
      setZoom(zoom: number): void;
      addListener(event: string, handler: (e: any) => void): void;
      fitBounds(bounds: LatLngBounds): void;
    }
    
    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: any);
        position?: { lat: number; lng: number };
        map?: Map | null;
      }
    }
    
    namespace places {
      class SearchBox {
        constructor(inputField: HTMLInputElement, options?: any);
        setBounds(bounds: LatLngBounds): void;
        addListener(event: string, handler: () => void): void;
        getPlaces(): Place[];
      }
      
      interface Place {
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
        formatted_address?: string;
        name?: string;
      }
    }
    
    class Geocoder {
      geocode(request: any, callback: (results: GeocoderResult[], status: string) => void): void;
    }
    
    interface GeocoderResult {
      formatted_address?: string;
    }
    
    class LatLng {
      constructor(lat: number, lng: number);
    }
    
    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(latlng: LatLng): void;
    }
    
    interface MapMouseEvent {
      latLng?: {
        lat(): number;
        lng(): number;
      };
    }

    namespace visualization {
      class HeatmapLayer {
        constructor(options: {
          data: Array<{ location: LatLng; weight?: number }>;
          map: Map;
          radius?: number;
          opacity?: number;
        });
        setMap(map: Map | null): void;
      }
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
  }
}

