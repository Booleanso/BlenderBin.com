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
}

module.exports = nextConfig