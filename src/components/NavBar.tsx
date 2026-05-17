"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function NavBar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-taupe-200 bg-white/80 backdrop-blur dark:border-taupe-800 dark:bg-taupe-950/80">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="WelcomeMat" width={36} height={24} priority />
          <span className="text-sm font-semibold text-taupe-800 dark:text-taupe-100">WelcomeMat</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 rounded-md text-taupe-600 transition hover:bg-taupe-100 dark:text-taupe-300 dark:hover:bg-taupe-800"
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-taupe-200 bg-white py-1 shadow-lg dark:border-taupe-700 dark:bg-taupe-800">
              <div className="border-b border-taupe-100 px-4 py-2 dark:border-taupe-700">
                <p className="truncate text-xs font-medium text-taupe-700 dark:text-taupe-200">{user.displayName}</p>
                <p className="truncate text-xs text-taupe-400 dark:text-taupe-500">{user.email}</p>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-taupe-700 transition hover:bg-taupe-50 dark:text-taupe-200 dark:hover:bg-taupe-700"
              >
                My trips
              </Link>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-taupe-50 dark:text-red-400 dark:hover:bg-taupe-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
