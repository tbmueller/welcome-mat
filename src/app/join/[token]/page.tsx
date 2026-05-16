"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <p className="text-center text-gray-600">
          Sign in with Google to accept your invitation.
        </p>
        <button
          onClick={signIn}
          className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium shadow-sm transition hover:bg-gray-50"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600">{errorMsg}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-blue-600 hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
