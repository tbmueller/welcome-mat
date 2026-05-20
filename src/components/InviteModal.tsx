"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import { Modal } from "@/components/Modal";

interface Props {
  tripId: string;
  onClose: () => void;
}

export function InviteModal({ tripId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [maxUses, setMaxUses] = useState(10);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createLink() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ inviteUrl: string }>("/api/invites", { tripId, maxUses });
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
    <Modal title="Invite guests" onClose={onClose}>

        {/* Link invite */}
        <div className="mb-4 rounded-xl border border-taupe-200 p-4 dark:border-taupe-700">
          <p className="mb-2 text-sm font-medium text-taupe-700 dark:text-taupe-300">Share a link</p>
          {inviteUrl ? (
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 rounded-lg border border-taupe-300 px-3 py-2 text-xs text-taupe-600 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-300"
              />
              <button
                onClick={copyLink}
                className="rounded-lg bg-taupe-100 px-3 py-2 text-xs font-medium transition hover:bg-taupe-200 dark:bg-taupe-700 dark:text-taupe-300 dark:hover:bg-taupe-600"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-xs text-taupe-500 dark:text-taupe-400 whitespace-nowrap">Max guests</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-taupe-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-900 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100"
                />
              </div>
              <button
                onClick={createLink}
                disabled={loading}
                className="w-full rounded-lg border border-taupe-300 py-2 text-sm font-medium text-taupe-700 transition hover:bg-taupe-50 disabled:opacity-50 dark:border-taupe-600 dark:text-taupe-300 dark:hover:bg-taupe-700"
              >
                {loading ? "Generating…" : "Generate invite link"}
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-taupe-200 p-4 dark:border-taupe-700">
          <p className="mb-2 text-sm font-medium text-taupe-700 dark:text-taupe-300">Or invite by email</p>
          <form onSubmit={sendEmail} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="min-w-0 flex-1 rounded-lg border border-taupe-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-900 dark:border-taupe-600 dark:bg-taupe-700 dark:text-taupe-100 dark:placeholder-taupe-400"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-pink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-900/70 active:bg-pink-950 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>

        {error && <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>}

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-taupe-200 py-2 text-sm text-taupe-500 transition hover:bg-taupe-50 dark:border-taupe-700 dark:text-taupe-400 dark:hover:bg-taupe-700"
        >
          Done
        </button>
    </Modal>
  );
}
