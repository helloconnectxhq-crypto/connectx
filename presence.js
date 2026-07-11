// ConnectX - presence.js
// Works across ALL pages — stores online status in Supabase table
// So any page can see who is online

import { supabase } from './supabase.js'

export const onlineUsers = new Set()
const listeners = []
let heartbeatInterval = null
let currentUserId = null

// ===== INIT PRESENCE =====
export async function initPresence(userId) {
  currentUserId = userId

  // 1. Mark self as online in DB
  await setOnlineStatus(userId, true)

  // 2. Heartbeat every 30s to stay online
  heartbeatInterval = setInterval(() => setOnlineStatus(userId, true), 30000)

  // 3. Mark offline when page closes
  window.addEventListener('beforeunload', () => {
    setOnlineStatus(userId, false)
    navigator.sendBeacon(`https://nyldfpwwabboixhxjvds.supabase.co/rest/v1/user_presence?user_id=eq.${userId}`,
      JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
    )
  })

  // 4. Mark online when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setOnlineStatus(userId, true)
    else setOnlineStatus(userId, false)
  })

  // 5. Load initial online users
  await loadOnlineUsers()

  // 6. Subscribe to real-time changes in presence table
  supabase.channel('presence-table')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_presence'
    }, () => {
      loadOnlineUsers()
    })
    .subscribe()
}

// Set online/offline in DB
async function setOnlineStatus(userId, isOnline) {
  await supabase.from('user_presence').upsert({
    user_id: userId,
    is_online: isOnline,
    last_seen: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

// Load all currently online users
async function loadOnlineUsers() {
  // Online = last_seen within 2 minutes AND is_online = true
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('user_presence')
    .select('user_id')
    .eq('is_online', true)
    .gte('last_seen', twoMinutesAgo)

  onlineUsers.clear()
  ;(data || []).forEach(row => onlineUsers.add(row.user_id))
  listeners.forEach(fn => fn(new Set(onlineUsers)))
  updateAllDots()
}

// Check if user is online
export function isOnline(userId) {
  return onlineUsers.has(userId)
}

// Register callback
export function onPresenceChange(fn) {
  listeners.push(fn)
}

// Update ALL [data-user-id] elements across the page
function updateAllDots() {
  document.querySelectorAll('[data-user-id]').forEach(el => {
    const uid = el.dataset.userId
    // Online dot
    const dot = el.querySelector('.online-dot')
    if (dot) dot.style.display = onlineUsers.has(uid) ? 'block' : 'none'
    // Status text
    const statusEl = el.querySelector('.online-status-text')
    if (statusEl) {
      statusEl.textContent = onlineUsers.has(uid) ? '🟢 Online' : ''
    }
  })
}