// supabase/functions/send-push/index.ts
// Deploy: supabase functions deploy send-push

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY  = 'BEF_ylhvIBxnkfEozHKzDkzFVSFBMh0PvsXzHU40bn1J94yPDO0DxOMRRT2SpD0UFX4y0LddAJAdPAVJhGs2vI4'
const VAPID_PRIVATE_KEY = 'Godl3l2KhNx37zxlKoCoGNuHZ419QnusvF4_jlZWQko'
const VAPID_SUBJECT     = 'mailto:connectx@example.com'

// Base64url helpers
function base64urlToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const b64std = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64std), c => c.charCodeAt(0))
}

function uint8ToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Generate VAPID JWT
async function makeVapidJWT(audience: string): Promise<string> {
  const header  = { alg: 'ES256', typ: 'JWT' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT
  }

  const enc = new TextEncoder()
  const headerB64  = uint8ToBase64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = uint8ToBase64url(enc.encode(JSON.stringify(payload)))
  const sigInput   = `${headerB64}.${payloadB64}`

  const keyData = base64urlToUint8(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(sigInput)
  )
  return `${sigInput}.${uint8ToBase64url(new Uint8Array(sig))}`
}

// Encrypt payload for web push (AES-128-GCM)
async function encryptPayload(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  plaintext: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
  )
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // Client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64urlToUint8(sub.keys.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']
  )
  const sharedBits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256)
  )

  const authSecret = base64urlToUint8(sub.keys.auth)

  // HKDF for PRK
  const prkKey = await crypto.subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveBits'])
  const authInfo = enc.encode('Content-Encoding: auth\0')
  const prkBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: authInfo }, prkKey, 256
  ))

  // Derive content encryption key + nonce
  const clientPub = base64urlToUint8(sub.keys.p256dh)
  const keyInfo = new Uint8Array([
    ...enc.encode('Content-Encoding: aesgcm\0'), 0,
    ...enc.encode('P-256\0'), 0,
    0, 65, ...clientPub,
    0, 65, ...serverPublicKeyRaw
  ])
  const nonceInfo = new Uint8Array([
    ...enc.encode('Content-Encoding: nonce\0'), 0,
    ...enc.encode('P-256\0'), 0,
    0, 65, ...clientPub,
    0, 65, ...serverPublicKeyRaw
  ])

  const prkCryptoKey = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits'])
  const cekBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkCryptoKey, 128
  ))
  const nonceBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkCryptoKey, 96
  ))

  const contentKey = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt'])

  // Pad + encrypt
  const plaintextBytes = enc.encode(plaintext)
  const padded = new Uint8Array(2 + plaintextBytes.length)
  padded.set(plaintextBytes, 2)

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, contentKey, padded)
  )

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) return new Response('Missing fields', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: url || '/messages.html',
      tag: 'connectx-msg',
      vibrate: [200, 100, 200]
    })

    let sent = 0
    for (const sub of subs) {
      try {
        const endpoint = sub.endpoint
        const origin   = new URL(endpoint).origin
        const jwt      = await makeVapidJWT(origin)
        const vapidAuth = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`

        // Try simple JSON push first (for FCM/modern browsers)
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidAuth,
            'Content-Type': 'application/json',
            'TTL': '86400'
          },
          body: payload
        })

        if (res.status === 201 || res.status === 200) sent++
        else if (res.status === 410 || res.status === 404) {
          // Subscription expired — delete it
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
        }
      } catch (e) {
        console.error('Push send error:', e)
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})