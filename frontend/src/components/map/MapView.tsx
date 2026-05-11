"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: number;
  name: string;
  description?: string;
  category: string;
  lng: number;
  lat: number;
}

interface MapViewProps {
  tileUrl?: string;
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: number | null;
  onMarkerClick?: (id: number) => void;
  onBoundsChange?: (bbox: string, zoom: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  spawn: "#22c55e",
  resource: "#3b82f6",
  tactical: "#f59e0b",
  extraction: "#a855f7",
  danger: "#ef4444",
};

export default function MapView({
  tileUrl,
  bounds,
  center = [35, 105],
  zoom = 4,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
  onBoundsChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const initRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || initRef.current) return;
    initRef.current = true;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    if (tileUrl && bounds) {
      map.options.crs = L.CRS.Simple;
      L.imageOverlay(tileUrl, bounds).addTo(map);
      map.fitBounds(bounds);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);
      map.setView(center, zoom);
    }

    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

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
      initRef.current = false;
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    markers.forEach((m) => {
      const color = CATEGORY_COLORS[m.category] || "#6b7280";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(`<b>${m.name}</b>${m.description ? `<br/>${m.description}` : ""}`)
        .on("click", () => onMarkerClick?.(m.id));

      layer.addLayer(marker);
    });
  }, [markers, onMarkerClick]);

  // Pan to selected marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedMarkerId) return;
    const m = markers.find((p) => p.id === selectedMarkerId);
    if (m) {
      map.setView([m.lat, m.lng], Math.max(map.getZoom(), 12), { animate: true });
    }
  }, [selectedMarkerId, markers]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />;
}
