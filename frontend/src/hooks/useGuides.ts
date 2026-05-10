"use client";
import { useState, useEffect } from "react";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useGuides() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [guideType, setGuideType] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (guideType) params.set("guide_type", guideType);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", "20");
    fetch(`${API_BASE}/api/guides?${params}`).then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, [search, guideType, sort, page]);

  return { data, loading, search, setSearch, guideType, setGuideType, sort, setSort, page, setPage };
}
