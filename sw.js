const CACHE_NAME = 'connectx-v7'
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
  '/presence.js',
  '/push-notify.js',
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

// Network first strategy
self.addEventListener('fetch', e => {
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

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = { title: 'ConnectX', body: 'You have a new notification', icon: '/icon-192.png', badge: '/icon-192.png' }
  try { data = { ...data, ...e.data.json() } } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/messages.html' },
      actions: data.actions || [],
      tag: data.tag || 'connectx-notif',
      renotify: true
    })
  )
})

// Click on notification — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/feed.html'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
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