// realtime.js - Complete Real-time System
import { supabase } from './supabase.js'

class RealtimeManager {
  constructor() {
    this.channels = {}
    this.listeners = {}
  }
  
  // Subscribe to post updates
  subscribePost(postId, callbacks) {
    const channel = supabase.channel(`post-${postId}`)
    
    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
        filter: `id=eq.${postId}`
      }, (payload) => {
        if (callbacks.onLike) callbacks.onLike(payload.new.likes_count)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, (payload) => {
        if (callbacks.onComment) callbacks.onComment(payload.new)
      })
      .subscribe()
    
    this.channels[postId] = channel
  }
  
  // Subscribe to reel updates
  subscribeReel(reelId, callbacks) {
    const channel = supabase.channel(`reel-${reelId}`)
    
    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reels',
        filter: `id=eq.${reelId}`
      }, (payload) => {
        if (callbacks.onLike) callbacks.onLike(payload.new.likes_count)
        if (callbacks.onView) callbacks.onView(payload.new.views_count)
      })
      .subscribe()
    
    this.channels[reelId] = channel
  }
  
  // Subscribe to new posts in feed
  subscribeFeed(callbacks) {
    const channel = supabase.channel('feed')
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        if (callbacks.onNewPost) callbacks.onNewPost(payload.new)
      })
      .subscribe()
    
    this.channels['feed'] = channel
  }
  
  // Subscribe to live streams
  subscribeLiveStreams(callbacks) {
    const channel = supabase.channel('live-streams')
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_streams'
      }, (payload) => {
        if (callbacks.onLiveStart) callbacks.onLiveStart(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_streams',
        filter: 'status=eq.ended'
      }, (payload) => {
        if (callbacks.onLiveEnd) callbacks.onLiveEnd(payload.new)
      })
      .subscribe()
    
    this.channels['live'] = channel
  }
  
  // Unsubscribe
  unsubscribe(key) {
    if (this.channels[key]) {
      this.channels[key].unsubscribe()
      delete this.channels[key]
    }
  }
}

export const realtime = new RealtimeManager()