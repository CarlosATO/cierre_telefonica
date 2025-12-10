import { defineConfig } from 'vite'

// Vite config tuned for Railway preview/production.
// Allows the Railway host and respects the PORT env var provided by the platform.
const RAILWAY_HOSTS = [
  'cierretelefonica-production.up.railway.app',
  // you can add other custom domains here if needed
]

export default defineConfig({
  server: {
    // bind to all interfaces so Railway (container) can accept connections
    host: process.env.PORT ? '0.0.0.0' : 'localhost',
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  preview: {
    // preview is used when running `vite preview` / `npm start` in Railway
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    // allow Railway hostname(s) so requests aren't blocked
    allowedHosts: RAILWAY_HOSTS.concat(['localhost']),
  },
})
