/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // ✅ FIX: Disable font optimization to prevent build failures  
  optimizeFonts: false,
  
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4420/api/:path*', // Proxy to Backend
      },
    ];
  },
  // Allow cross-origin requests from lumalance.xyz in development
  allowedDevOrigins: [
    'lumalance.xyz',
    'www.lumalance.xyz'
  ],
  // Enable experimental features if needed
  // experimental: {
  //   serverActions: true, // Server Actions are now enabled by default
  // },
};

module.exports = nextConfig;
