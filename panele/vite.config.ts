import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

function copyPdfWorker(): Plugin {
  return {
    name: 'copy-pdf-worker',
    buildStart() {
      copyFileSync(
        resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
        resolve(__dirname, 'public/pdf-worker.js'),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyPdfWorker()],
})
