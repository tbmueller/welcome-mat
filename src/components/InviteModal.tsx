"use client";

import { useState } from "react";
import { Button, TextField } from "@radix-ui/themes";
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
      <div className="mb-4 rounded-xl border border-taupe-200 p-4 dark:border-taupe-700">
        <p className="mb-3 text-sm font-medium text-taupe-700 dark:text-taupe-300">Share a link</p>
        {inviteUrl ? (
          <div className="flex gap-2">
            <TextField.Root
              readOnly
              value={inviteUrl}
              className="min-w-0 flex-1 text-xs"
            />
            <Button variant="soft" color="gray" onClick={copyLink}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-taupe-500 dark:text-taupe-400 whitespace-nowrap">Max guests</label>
              <TextField.Root
                type="number"
                min="1"
                max="500"
                value={String(maxUses)}
                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20"
              />
            </div>
            <Button variant="outline" color="gray" onClick={createLink} disabled={loading} className="w-full">
              {loading ? "Generating…" : "Generate invite link"}
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-taupe-200 p-4 dark:border-taupe-700">
        <p className="mb-3 text-sm font-medium text-taupe-700 dark:text-taupe-300">Or invite by email</p>
        <form onSubmit={sendEmail} className="flex gap-2">
          <TextField.Root
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={loading}>Send</Button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>}

      <Button variant="outline" color="gray" onClick={onClose} className="w-full">
        Done
      </Button>
    </Modal>
  );
}
