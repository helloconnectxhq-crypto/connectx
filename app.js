// ================================================================
// ConnectX - app.js
// Shared utilities used across all pages
// Import: <script type="module"> import './app.js' </script>
// ================================================================

import { supabase } from './supabase.js'

// ================================================================
// AUTH GUARD - redirect to login if not authenticated
// Usage: import { requireAuth } from './app.js'
//        const user = await requireAuth()
// ================================================================
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = 'index.html'
    return null
  }
  return session.user
}

// ================================================================
// TOAST NOTIFICATION
// Usage: import { showToast } from './app.js'
//        showToast('Hello!', 'success')   // green
//        showToast('Error!', 'error')     // red
//        showToast('Just info')           // default
// ================================================================
export function showToast(message, type = 'default') {
  const existing = document.getElementById('_cx_toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = '_cx_toast'
  toast.className = 'toast'
  toast.textContent = message

  if (type === 'success') toast.style.borderColor = '#00C853'
  if (type === 'error')   toast.style.borderColor = '#FF5252'

  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 350)
  }, 3000)
}

// ================================================================
// TIME FORMATTER
// Usage: import { formatTime } from './app.js'
//        formatTime('2026-06-01T10:00:00Z') → '3d ago'
// ================================================================
export function formatTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ================================================================
// ATOMIC LIKE TOGGLE (uses Supabase RPC — no race conditions)
// Usage: import { togglePostLike } from './app.js'
//        const { liked, likes_count } = await togglePostLike(postId, userId)
// ================================================================
export async function togglePostLike(postId, userId) {
  const { data, error } = await supabase.rpc('toggle_post_like', {
    p_post_id: postId,
    p_user_id: userId
  })
  if (error) {
    console.error('Like error:', error)
    return null
  }
  return data
}

export async function toggleReelLike(reelId, userId) {
  const { data, error } = await supabase.rpc('toggle_reel_like', {
    p_reel_id: reelId,
    p_user_id: userId
  })
  if (error) {
    console.error('Reel like error:', error)
    return null
  }
  return data
}

// ================================================================
// HTML ESCAPE (prevent XSS)
// Usage: escHtml(userProvidedString)
// ================================================================
export function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ================================================================
// COPY TO CLIPBOARD with toast feedback
// Usage: copyToClipboard('some text', 'Link copied!')
// ================================================================
export async function copyToClipboard(text, successMsg = 'Copied!') {
  try {
    await navigator.clipboard.writeText(text)
    showToast(successMsg, 'success')
  } catch {
    showToast('Copy failed — please copy manually', 'error')
  }
}

// ================================================================
// SEND NOTIFICATION
// Usage: import { sendNotification } from './app.js'
//        await sendNotification({ toUserId, fromUserId, type, postId })
//        type: 'like' | 'comment' | 'follow' | 'message'
// ================================================================
export async function sendNotification({ toUserId, fromUserId, type, postId = null }) {
  if (toUserId === fromUserId) return  // don't notify yourself
  await supabase.from('notifications').insert({
    user_id:  toUserId,
    actor_id: fromUserId,
    type,
    post_id:  postId
  })
}

// ================================================================
// AVATAR HTML helper
// Returns img tag if avatar_url, else colored initial div
// ================================================================
export function avatarHtml(profile, size = 40, classes = '') {
  const username = profile?.username || 'user'
  const initial  = username[0].toUpperCase()
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="${escHtml(username)}"
      style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" class="${classes}"/>`
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;
    background:linear-gradient(135deg,#6C63FF,#00D4AA);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.4)}px;font-weight:700;color:#fff;flex-shrink:0;" class="${classes}">${initial}</div>`
}

// ================================================================
// LOGOUT
// ================================================================
export async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}

// ================================================================
// SERVICE WORKER registration
// ================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}