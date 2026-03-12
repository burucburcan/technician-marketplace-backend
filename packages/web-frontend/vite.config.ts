import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Build-time validation for VITE_API_URL
  // This ensures the build fails early if the critical environment variable is missing
  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      '\n❌ Build Error: VITE_API_URL environment variable is required for production builds.\n\n' +
      'Please set VITE_API_URL in one of the following ways:\n' +
      '  1. Add it to Railway environment variables (recommended for deployment)\n' +
      '  2. Create a .env.production file with: VITE_API_URL=https://your-backend-url\n' +
      '  3. Set it as a system environment variable\n\n' +
      'Example: VITE_API_URL=https://technician-marketplacebackend-production.up.railway.app\n'
    )
  }
  
  // Log the API URL during build for verification (only in production)
  if (mode === 'production' && env.VITE_API_URL) {
    console.log('✅ VITE_API_URL configured:', env.VITE_API_URL)
  }
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
