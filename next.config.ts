import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Applied in all environments — needed for Firebase signInWithPopup to work.
// Next.js 15 defaults to same-origin which blocks the OAuth popup from
// communicating back to the parent window.
const baseHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// CSP and other strict headers only in production — dev mode needs unsafe-eval
// (React) and unsafe-inline (Next.js font injection, React DevTools, Tailwind).
const productionHeaders = [
  ...baseHeaders,
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "img-src 'self' data: https://maps.googleapis.com https://lh3.googleusercontent.com",
      "frame-src https://trip-tracker-65041.firebaseapp.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: isDev ? baseHeaders : productionHeaders,
      },
    ];
  },
};

export default nextConfig;
