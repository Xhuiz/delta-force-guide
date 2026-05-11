export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const callback = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?callback=${callback}`;
    }
  }

  return res;
}

export async function fetchMaps() {
  const res = await apiFetch("/api/maps");
  if (!res.ok) throw new Error("Failed to fetch maps");
  return res.json();
}

export async function fetchMapPoints(mapId: number, bbox?: string, category?: string) {
  const params = new URLSearchParams();
  if (bbox) params.set("bbox", bbox);
  if (category) params.set("category", category);
  const res = await apiFetch(`/api/maps/${mapId}/points?${params}`);
  if (!res.ok) throw new Error("Failed to fetch points");
  return res.json();
}
