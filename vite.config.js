import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@vietmap/vietmap-gl-js']
  },
  resolve: {
    alias: {
      '@vietmap/vietmap-gl-js': '@vietmap/vietmap-gl-js/dist/vietmap-gl.js'
    }
  }
})
