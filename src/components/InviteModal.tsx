"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";

interface Props {
  tripId: string;
  onClose: () => void;
}

export function InviteModal({ tripId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createLink() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ inviteUrl: string }>("/api/invites", { tripId });
      setInviteUrl(res.inviteUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/invites", { tripId, email });
      setEmail("");
      alert(`Invite sent to ${email}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Invite guests</h2>

        {/* Link invite */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700">Share a link</p>
          {inviteUrl ? (
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600"
              />
              <button
                onClick={copyLink}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium transition hover:bg-gray-200"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <button
              onClick={createLink}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate invite link"}
            </button>
          )}
        </div>

        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700">Or invite by email</p>
          <form onSubmit={sendEmail} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 transition hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
