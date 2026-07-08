// ConnectX - Push Notification Module
// Import this in any page to enable push notifications

const VAPID_PUBLIC_KEY = 'BEF_ylhvIBxnkfEozHKzDkzFVSFBMh0PvsXzHU40bn1J94yPDO0DxOMRRT2SpD0UFX4y0LddAJAdPAVJhGs2vI4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

// Request permission + subscribe to push
export async function initPushNotifications(supabase, userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported')
    return false
  }

  // Ask permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.log('Push permission denied')
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // Save subscription to Supabase
    const subJson = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

    console.log('Push subscription saved!')
    return true
  } catch (err) {
    console.error('Push subscribe error:', err)
    return false
  }
}

// Show local notification (in-app toast alternative)
export function showLocalNotification(title, body, url = '/messages.html') {
  if (Notification.permission === 'granted' && document.hidden) {
    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'connectx-msg'
    })
    n.onclick = () => { window.focus(); window.location.href = url; n.close() }
  }
}