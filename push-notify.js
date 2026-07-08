// ConnectX - OneSignal Push Notification Module
const ONESIGNAL_APP_ID  = 'bea396dc-7d22-4c1b-9b53-f51ba4276765'
const SUPABASE_URL      = 'https://nyldfpwwabboixhxjvds.supabase.co'
const SUPABASE_ANON     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGRmcHd3YWJib2l4aHhqdmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzIzMjAsImV4cCI6MjA5Njk0ODMyMH0.MlTu9PUMaLTsSuLFZds4tV21BJQYhrAxKNc_z3A6P34'

// Init OneSignal + set external user ID
export async function initPushNotifications(supabase, userId) {
  if (typeof window === 'undefined') return false

  try {
    // Wait for OneSignal to load
    await new Promise((resolve) => {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(resolve)
      } else {
        resolve()
      }
    })

    if (!window.OneSignal) return false

    // Set external user ID so we can target by user
    await window.OneSignal.login(userId)

    // Request permission
    await window.OneSignal.Notifications.requestPermission()

    // Save OneSignal player ID to Supabase
    const playerId = await window.OneSignal.User.PushSubscription.id
    if (playerId) {
      await supabase.from('onesignal_players').upsert({
        user_id: userId,
        player_id: playerId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
    }

    console.log('✅ OneSignal push initialized!')
    return true
  } catch (err) {
    console.error('OneSignal init error:', err)
    return false
  }
}

// Send push to user via Supabase Edge Function (calls OneSignal REST API)
export async function sendPushToUser(toUserId, title, body, url = '/messages.html') {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify({ user_id: toUserId, title, body, url })
    })
  } catch (e) {
    console.error('Push send error:', e)
  }
}

// Local notification when app is open
export function showLocalNotification(title, body, url = '/messages.html') {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
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