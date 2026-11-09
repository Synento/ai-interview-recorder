import type { NextConfig } from 'next'

/**
 * Next 16 refuses dev assets from any host other than the one the server
 * booted on. `localhost` and `127.0.0.1` are different hosts, and a candidate
 * joining from the other spelling otherwise gets a page whose buttons do nothing.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  serverExternalPackages: ['@synento/node'],
  transpilePackages: ['@synento/client', '@synento/player', '@synento/react'],
}

export default nextConfig
