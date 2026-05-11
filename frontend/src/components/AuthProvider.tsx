"use client";

import { useAuthInit } from "@/hooks/useAuth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return <>{children}</>;
}
