const CACHE_NAME = 'bynari-v1'

// Asset statici da pre-cachare
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
]

// ── Install ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// ── Activate — pulisce cache vecchie ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Push notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo/Bynari_WO1.png',
      badge: '/logo/Bynari_WO1.png',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignora richieste non GET e richieste Supabase/API
  if (request.method !== 'GET') return
  if (request.url.includes('supabase.co')) return
  if (request.url.includes('/api/')) return

  // Per navigazione (pagine HTML) → Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva in cache la risposta fresca
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => {
          // Offline → serve dalla cache
          return caches.match(request).then((cached) => {
            if (cached) return cached
            // Fallback alla root se la pagina non è in cache
            return caches.match('/')
          })
        })
    )
    return
  }

  // Per asset statici (JS, CSS, font, immagini) → Cache First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
  }
})
