const CACHE_NAME = 'connectx-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/feed.html',
  '/profile.html',
  '/search.html',
  '/messages.html',
  '/signup.html',
  '/style.css',
  '/supabase.js'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  )
})

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})