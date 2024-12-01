import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Add a rule to ignore all files in the specified folders
    config.module.rules.push({
      test: /roadmap|settings|installation|components|aws-s3\//, // Match any file in folder1, folder2, or folder3
      use: "ignore-loader", // Use ignore-loader to prevent processing
    });

    return config;
  },
};

export default nextConfig;
