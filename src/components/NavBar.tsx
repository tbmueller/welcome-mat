"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, IconButton } from "@radix-ui/themes";
import { useAuth } from "@/hooks/useAuth";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";
import { MatLogo } from "@/components/MatLogo";

export function NavBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-taupe-200 bg-white/80 backdrop-blur dark:border-taupe-800 dark:bg-taupe-950/80">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <MatLogo width={36} height={24} />
          <span className="text-sm font-semibold text-taupe-800 dark:text-taupe-100">WelcomeMat</span>
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" color="gray" aria-label="Menu" size="2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="3" width="14" height="1.5" rx="0.75" />
                <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" />
                <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" />
              </svg>
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" style={{ minWidth: "180px" }}>
            <div className="border-b border-taupe-100 px-3 py-2 dark:border-taupe-700">
              <p className="truncate text-xs font-medium text-taupe-700 dark:text-taupe-200">{user.displayName}</p>
              <p className="truncate text-xs text-taupe-400 dark:text-taupe-500">{user.email}</p>
            </div>
            <DropdownMenu.Item onSelect={() => router.push("/dashboard")}>
              My trips
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => router.push("/profile")}>
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <ThemeColorPicker />
            <DropdownMenu.Separator />
            <DropdownMenu.Item color="red" onSelect={signOut}>
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
