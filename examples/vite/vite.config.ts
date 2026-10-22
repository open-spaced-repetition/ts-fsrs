import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  optimizeDeps: {
    exclude: ['@open-spaced-repetition/binding-wasm32-wasip1'],
  },
})
