import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { randomBytes } from 'crypto'

/**
 * Inyecta una Content-Security-Policy con nonce en cada build y en cada
 * petición de dev. El nonce se añade automáticamente a todos los <script>
 * del index.html, permitiendo solo scripts propios de la app.
 */
function cspNonce() {
  let isDev = true
  let nonce = ''

  return {
    name: 'html-csp-nonce',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    transformIndexHtml(html) {
      if (!nonce) nonce = randomBytes(16).toString('hex')

      const directives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 https://fonts.googleapis.com https://fonts.gstatic.com" + (isDev ? ' ws://localhost:5173' : ''),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')

      const meta = `<meta http-equiv="Content-Security-Policy" content="${directives}" />`

      const withNonce = html.replace(/<script(?![^>]*nonce=)/g, `<script nonce="${nonce}"`)
      return withNonce.replace('<head>', `<head>\n  ${meta}`)
    }
  }
}

export default defineConfig({
  plugins: [vue(), cspNonce()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: './',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
