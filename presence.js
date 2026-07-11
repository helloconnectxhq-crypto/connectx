// ConnectX - presence.js
// Global online presence system — import in any page
// Usage: import { initPresence, isOnline, onPresenceChange } from './presence.js'

import { supabase } from './supabase.js'

let presenceChannel = null
export const onlineUsers = new Set()
const listeners = []

// Start tracking presence for current user + listen to all others
export async function initPresence(userId) {
  if (presenceChannel) return // already running

  presenceChannel = supabase.channel('global-presence', {
    config: { presence: { key: userId } }
  })

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      onlineUsers.clear()
      Object.keys(state).forEach(id => onlineUsers.add(id))
      listeners.forEach(fn => fn(new Set(onlineUsers)))
      updateAllDots()
    })
    .on('presence', { event: 'join' }, ({ key }) => {
      onlineUsers.add(key)
      listeners.forEach(fn => fn(new Set(onlineUsers)))
      updateAllDots()
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      onlineUsers.delete(key)
      listeners.forEach(fn => fn(new Set(onlineUsers)))
      updateAllDots()
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString()
        })
      }
    })
}

// Check if a specific user is online
export function isOnline(userId) {
  return onlineUsers.has(userId)
}

// Register a callback for presence changes
export function onPresenceChange(fn) {
  listeners.push(fn)
}

// Update all [data-user-id] elements with online dot
function updateAllDots() {
  document.querySelectorAll('[data-user-id]').forEach(el => {
    const uid = el.dataset.userId
    const dot = el.querySelector('.online-dot')
    if (dot) {
      dot.style.display = onlineUsers.has(uid) ? 'block' : 'none'
    }
    // Also update status text if exists
    const status = el.querySelector('.online-status-text')
    if (status) {
      status.textContent = onlineUsers.has(uid) ? '🟢 Online' : ''
      status.style.color = 'var(--success)'
    }
  })
}