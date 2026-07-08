// ConnectX - Send Push via OneSignal
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID  = 'bea396dc-7d22-4c1b-9b53-f51ba4276765'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type'
      }
    })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
    }

    // Get player ID from Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: player } = await supabase
      .from('onesignal_players')
      .select('player_id')
      .eq('user_id', user_id)
      .single()

    if (!player?.player_id) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No player ID' }), { status: 200 })
    }

    // Send via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [player.player_id],
        headings: { en: title },
        contents: { en: body },
        url: `https://connectx-psi.vercel.app${url}`,
        web_push_topic: 'connectx-msg',
        chrome_web_icon: 'https://connectx-psi.vercel.app/icon-192.png',
        firefox_icon: 'https://connectx-psi.vercel.app/icon-192.png'
      })
    })

    const result = await response.json()
    return new Response(JSON.stringify({ sent: 1, result }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})