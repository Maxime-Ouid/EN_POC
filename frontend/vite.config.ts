import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Certificats mkcert générés à la racine du projet. Le SAN doit lister les
// sous-domaines EXACTS (officea.localhost, officeb.localhost...), pas seulement le
// wildcard *.localhost : les validateurs TLS (OpenSSL, Chrome, Windows) refusent un
// wildcard sur un domaine à un seul label comme "localhost" (même règle de fond que le
// rejet des cookies Domain=.localhost déjà rencontré — restriction liée à la Public
// Suffix List, mkcert le signale lui-même à la génération). Régénérer avec :
//   mkcert localhost "*.localhost" officea.localhost officeb.localhost 127.0.0.1 ::1
const certDir = path.resolve(import.meta.dirname, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(certDir, 'localhost+5-key.pem')),
      cert: fs.readFileSync(path.resolve(certDir, 'localhost+5.pem')),
    },
  },
})
