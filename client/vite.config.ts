import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When the frontend calls any URL starting with "/api"
      '/api': {
        target: 'http://localhost:5001', // Target our Express server
        changeOrigin: true,            // Necessary for some header matching
        secure: false,                 // We don't have SSL/HTTPS locally, so this is fine
      },
    },
  },
})