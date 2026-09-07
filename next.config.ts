import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['localhost', '127.0.0.1', '26.12.34.67', '192.168.123.156'],
  async rewrites() {
    return [
      {
        source: '/liff/bind/bind',
        destination: '/liff/bind',
      },
      {
        source: '/liff/dashboard/dashboard',
        destination: '/liff/dashboard',
      },
    ];
  },
};

export default nextConfig;
