/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // This allows importing JSON files like package.json
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    })
    return config
  },
  // Ensure the public directory is properly handled
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
}

export default nextConfig
