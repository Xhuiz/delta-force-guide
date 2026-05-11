"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export function useRequireAuth() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const callback = encodeURIComponent(window.location.pathname);
      router.push(`/login?callback=${callback}`);
    }
  }, [user, loading, router]);

  return { user, loading };
}

export function useAuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
}
