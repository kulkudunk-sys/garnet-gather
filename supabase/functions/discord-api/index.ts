import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '')
    const action = pathSegments[pathSegments.length - 1] // последний сегмент пути
    
    console.log('Action:', action, 'Method:', req.method)

    switch (action) {
      case 'servers':
        return await handleServers(req, supabaseClient, user.id)
      
      case 'channels':
        return await handleChannels(req, supabaseClient, user.id)
      
      case 'messages':
        return await handleMessages(req, supabaseClient, user.id)
      
      case 'join-server':
        return await handleJoinServer(req, supabaseClient, user.id)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleServers(req: Request, supabaseClient: any, userId: string) {
  if (req.method === 'GET') {
    // Получить серверы пользователя
    const { data: servers, error } = await supabaseClient
      .from('servers')
      .select(`
        *,
        server_members!inner(role)
      `)
      .eq('server_members.user_id', userId)
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ servers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  if (req.method === 'POST') {
    // Создать новый сервер
    const { name, description } = await req.json()
    
    console.log('Creating server:', { name, description, userId })
    
    // Создаем сервер с правильным owner_id для RLS
    const { data: server, error: serverError } = await supabaseClient
      .from('servers')
      .insert({
        name,
        description,
        owner_id: userId
      })
      .select()
      .single()
    
    if (serverError) {
      console.error('Server creation error:', serverError)
      throw serverError
    }
    
    console.log('Server created successfully:', server)
    
    // Добавляем создателя как владельца в server_members
    const { error: memberError } = await supabaseClient
      .from('server_members')
      .insert({
        server_id: server.id,
        user_id: userId,
        role: 'admin'
      })
    
    if (memberError) {
      console.error('Member creation error:', memberError)
      throw memberError
    }
    
    console.log('Server member added successfully')
    
    // Создаем базовые каналы
    const { error: channelError } = await supabaseClient
      .from('channels')
      .insert([
        {
          server_id: server.id,
          name: 'общий',
          type: 'text',
          position: 0
        },
        {
          server_id: server.id,
          name: 'Общий голосовой',
          type: 'voice',
          position: 1
        }
      ])
    
    if (channelError) throw channelError
    
    return new Response(
      JSON.stringify({ server }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function handleChannels(req: Request, supabaseClient: any, userId: string) {
  const url = new URL(req.url)
  const serverId = url.searchParams.get('server_id')
  
  if (!serverId) {
    return new Response(
      JSON.stringify({ error: 'Server ID required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
  
  if (req.method === 'GET') {
    // Получить каналы сервера
    const { data: channels, error } = await supabaseClient
      .from('channels')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  if (req.method === 'POST') {
    // Создать новый канал (только админы/владельцы)
    const { name, type = 'text' } = await req.json()
    
    // Проверяем права
    const { data: member } = await supabaseClient
      .from('server_members')
      .select('role')
      .eq('server_id', serverId)
      .eq('user_id', userId)
      .single()
    
    if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const { data: channel, error } = await supabaseClient
      .from('channels')
      .insert({
        server_id: serverId,
        name,
        type
      })
      .select()
      .single()
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ channel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function handleMessages(req: Request, supabaseClient: any, userId: string) {
  const url = new URL(req.url)
  const channelId = url.searchParams.get('channel_id')
  
  if (!channelId) {
    return new Response(
      JSON.stringify({ error: 'Channel ID required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
  
  if (req.method === 'GET') {
    // Получить сообщения канала
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    const { data: messages, error } = await supabaseClient
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Messages fetch error:', error)
      throw error
    }
    
    return new Response(
      JSON.stringify({ messages: messages.reverse() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  if (req.method === 'POST') {
    // Отправить сообщение
    const { content } = await req.json()
    
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message content required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const { data: message, error } = await supabaseClient
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: userId,
        content: content.trim()
      })
      .select(`
        *,
        profiles!messages_user_id_fkey(username, display_name, avatar_url)
      `)
      .single()
    
    if (error) {
      console.error('Message send error:', error)
      throw error
    }
    
    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function handleJoinServer(req: Request, supabaseClient: any, userId: string) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
  
  const { server_id, invite_code } = await req.json()
  
  // В реальном приложении здесь была бы проверка invite_code
  // Пока просто добавляем пользователя как участника
  
  const { data: member, error } = await supabaseClient
    .from('server_members')
    .insert({
      server_id,
      user_id: userId,
      role: 'member'
    })
    .select()
    .single()
  
  if (error) {
    if (error.code === '23505') { // unique constraint violation
      return new Response(
        JSON.stringify({ error: 'Already a member of this server' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    throw error
  }
  
  return new Response(
    JSON.stringify({ member }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}