// ConnectX - app.js
// Shared utilities and helpers used across all pages

// ===== TIME FORMATTING =====
export function formatTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatChatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ===== TOAST =====
export function showToast(msg, duration = 3000) {
  const existing = document.querySelector('.toast')
  if (!existing) return
  existing.textContent = msg
  existing.classList.add('show')
  setTimeout(() => existing.classList.remove('show'), duration)
}

// ===== AUTH GUARD =====
// Call at top of each protected page
export async function requireAuth(supabase) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = 'index.html'
    return null
  }
  return session.user
}

// ===== AVATAR HTML HELPER =====
export function avatarHtml(profile, size = 40) {
  const username = profile?.username || 'U'
  const initial = username[0].toUpperCase()
  const imgStyle = `width:100%;height:100%;object-fit:cover;border-radius:50%;`
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="${username}" style="${imgStyle}"/>`
  }
  return initial
}

// ===== PWA SERVICE WORKER REGISTRATION =====
export function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err)
    })
  }
}

// ===== COPY TO CLIPBOARD =====
export async function copyToClipboard(text, toastMsg = '🔗 Copied!') {
  try {
    await navigator.clipboard.writeText(text)
    showToast(toastMsg)
  } catch {
    showToast('❌ Could not copy')
  }
}