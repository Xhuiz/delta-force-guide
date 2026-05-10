"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async (email: string, password: string) => {
    try {
      setError(null);
      await login(email, password);
      router.push("/");
    } catch {
      setError("邮箱或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">登录</h1>
        <LoginForm onSubmit={handleSubmit} error={error} />
        <p className="text-center mt-4 text-sm text-gray-600">
          还没有账号？{" "}
          <Link href="/register" className="text-blue-500 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  );
}
