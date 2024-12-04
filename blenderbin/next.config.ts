import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  images: {
    domains: ['d3e54v103j8qbb.cloudfront.net'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /draco.*\.wasm$/,
      type: 'asset/resource'
    });
    return config;
  }
}

export default nextConfig