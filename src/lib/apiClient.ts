// Thin wrapper around fetch that attaches the Firebase ID token and
// retries once on 401 with a fresh token.

import { auth } from "./firebase";

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Force token refresh and retry once
    const freshToken = await auth.currentUser?.getIdToken(true);
    const retry = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freshToken}`,
        ...(options.headers ?? {}),
      },
    });
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({ error: retry.statusText }));
      throw new Error(err.error ?? "Request failed");
    }
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
