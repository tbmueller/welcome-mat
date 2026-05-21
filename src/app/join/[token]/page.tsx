"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";

export default function JoinPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"idle" | "redeeming" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loading || !user || status !== "idle") return;
    setStatus("redeeming");
    api
      .post<{ tripId: string }>("/api/invites/redeem", { token })
      .then(({ tripId }) => router.replace(`/trip/${tripId}`))
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Invite could not be redeemed");
      });
  }, [user, loading, token, status, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <p className="text-center text-taupe-600 dark:text-taupe-400">
          Sign in with Google to accept your invitation.
        </p>
        <Button variant="outline" color="gray" size="3" onClick={signIn}>
          Sign in with Google
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 dark:text-red-400">{errorMsg}</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-9)] border-t-transparent" />
    </div>
  );
}
