import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY' // Bloquea Clickjacking (no permite iframes)
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' // Bloquea hardware del usuario
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff' // Previene MIME-Sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin' // Evita filtración de URLs internas
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
