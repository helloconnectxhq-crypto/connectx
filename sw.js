const CACHE_NAME = 'connectx-v5'
const ASSETS = [
  '/',
  '/index.html',
  '/feed.html',
  '/profile.html',
  '/search.html',
  '/messages.html',
  '/reels.html',
  '/live.html',
  '/signup.html',
  '/reset-password.html',
  '/style.css',
  '/supabase.js',
  '/realtime.js',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/favicon.ico'
]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Network first — always get fresh content, fallback to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return
  if (e.request.url.startsWith('chrome-extension')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})