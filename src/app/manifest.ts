import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bynari',
    short_name: 'Bynari',
    description: 'La tua piattaforma per la gestione degli allenamenti',
    start_url: '/app',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#f97316',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
