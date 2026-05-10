"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  tileUrl?: string;
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bbox: string, zoom: number) => void;
}

export default function MapView({ tileUrl, bounds, center = [35, 105], zoom = 4, onBoundsChange }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    if (tileUrl && bounds) {
      // Game map mode: image overlay with CRS.Simple
      map.options.crs = L.CRS.Simple;
      L.imageOverlay(tileUrl, bounds).addTo(map);
      map.fitBounds(bounds);
    } else {
      // Standard map mode: OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);
      map.setView(center, zoom);
    }

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("moveend", () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        const z = map.getZoom();
        onBoundsChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`, z);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tileUrl, bounds, center, zoom]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />;
}
