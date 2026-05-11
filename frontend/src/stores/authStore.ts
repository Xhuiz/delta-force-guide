import { create } from "zustand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,

  init: () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      set({ token });
      get().fetchUser();
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("登录失败");
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ token: data.access_token });
    await get().fetchUser();
  },

  register: async (username, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error("注册失败");
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ token: data.access_token });
    await get().fetchUser();
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, token: null });
    window.location.href = "/";
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const user = await res.json();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
