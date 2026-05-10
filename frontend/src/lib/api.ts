const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMaps() {
  const res = await fetch(`${API_BASE}/api/maps`);
  if (!res.ok) throw new Error("Failed to fetch maps");
  return res.json();
}

export async function fetchMapPoints(mapId: number, bbox?: string, category?: string) {
  const params = new URLSearchParams();
  if (bbox) params.set("bbox", bbox);
  if (category) params.set("category", category);
  const res = await fetch(`${API_BASE}/api/maps/${mapId}/points?${params}`);
  if (!res.ok) throw new Error("Failed to fetch points");
  return res.json();
}
