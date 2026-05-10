"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  tileUrl: string;
  bounds?: [[number, number], [number, number]];
  onBoundsChange?: (bbox: string, zoom: number) => void;
}

export default function MapView({ tileUrl, bounds, onBoundsChange }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
    });

    if (bounds) {
      L.imageOverlay(tileUrl, bounds).addTo(map);
      map.fitBounds(bounds);
    } else {
      L.tileLayer(tileUrl, { maxZoom: 5 }).addTo(map);
    }

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("moveend", () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        const zoom = map.getZoom();
        onBoundsChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`, zoom);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tileUrl, bounds]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />;
}
