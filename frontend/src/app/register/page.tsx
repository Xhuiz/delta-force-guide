"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleSubmit = async (username: string, email: string, password: string) => {
    try {
      setError(null);
      await register(username, email, password);
      router.push("/");
    } catch {
      setError("注册失败，邮箱可能已被使用");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">注册</h1>
        <RegisterForm onSubmit={handleSubmit} error={error} />
        <p className="text-center mt-4 text-sm text-gray-600">
          已有账号？{" "}
          <Link href="/login" className="text-blue-500 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
