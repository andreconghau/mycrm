import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/v1/swagger-assets/*': [
      './node_modules/swagger-ui-dist/swagger-ui-bundle.js',
      './node_modules/swagger-ui-dist/swagger-ui.css',
    ],
  },
}

export default nextConfig
