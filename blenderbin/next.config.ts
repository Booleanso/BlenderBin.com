/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blenderbin.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/BACKEND/**',
      },
    ],
  },
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during builds
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig