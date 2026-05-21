"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">WelcomeMat</h1>
        <p className="mt-3 text-taupe-500 dark:text-taupe-400">
          Track your guests&apos; flights and know exactly when to leave.
        </p>
      </div>
      <button
        onClick={signIn}
        className="flex items-center gap-3 rounded-lg border border-taupe-300 bg-white px-6 py-3 text-sm font-medium shadow-sm transition hover:bg-taupe-50 dark:border-taupe-600 dark:bg-taupe-800 dark:text-taupe-100 dark:hover:bg-taupe-700"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.6 5.6 2.7 13.8l7.9 6.1C12.5 13.4 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
          <path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.9-6.1C.9 15.9 0 19.8 0 24s.9 8.1 2.7 11.4l7.9-6.9z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.9C6.6 42.4 14.6 48 24 48z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
