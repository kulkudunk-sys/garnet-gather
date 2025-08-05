import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface VoiceUser {
  user_id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

interface VoiceChannelState {
  channelId: string;
  users: VoiceUser[];
}

export const useVoiceChannel = (channelId: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<VoiceUser[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const voicePresenceRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Voice Activity Detection
  const setupVoiceActivityDetection = useCallback((stream: MediaStream, audioContext: AudioContext) => {
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;
    microphone.connect(analyser);
    
    analyserRef.current = analyser;
    
    const detectVoiceActivity = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      // Более чувствительный порог для детекции речи
      const speaking = volume > 10; 
      
      console.log('Voice activity - Volume:', volume, 'Speaking:', speaking);
      
      if (speaking !== isSpeaking) {
        console.log('Speech state changed:', speaking);
        setIsSpeaking(speaking);
        updateVoicePresence(speaking);
      }
      
      requestAnimationFrame(detectVoiceActivity);
    };
    
    detectVoiceActivity();
  }, [isSpeaking]);

  // ПРОСТОЕ И РАБОЧЕЕ обновление presence
  const updateVoicePresence = useCallback(async (speaking: boolean) => {
    if (!channelId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const username = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
    
    // ПРЯМОЕ подключение к тому же каналу что используется в sidebar
    if (!voicePresenceRef.current) {
      console.log('Creating voice presence channel for SIDEBAR...');
      voicePresenceRef.current = supabase.channel('sidebar_voice_users');
      await voicePresenceRef.current.subscribe();
      console.log('Voice presence channel created and subscribed!');
    }
    
    // Отправляем данные о пользователе
    const presenceData = {
      user_id: user.id,
      username: username,
      channel_id: channelId,
      isMuted: isMuted,
      isSpeaking: speaking,
      joined_at: new Date().toISOString()
    };
    
    console.log('=== TRACKING VOICE PRESENCE ===');
    console.log('Presence data:', presenceData);
    
    await voicePresenceRef.current.track(presenceData);
  }, [channelId, isMuted]);

  // Создание RTCPeerConnection для пользователя
  const createPeerConnection = useCallback(async (userId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Добавляем локальный аудио поток
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Обработка входящих аудио потоков
    pc.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      const remoteStream = event.streams[0];
      
      let audioElement = audioElementsRef.current.get(userId);
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElementsRef.current.set(userId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
    };

    // Обработка ICE кандидатов
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: supabase.auth.getUser().then(u => u.data.user?.id),
            to: userId
          }
        });
      }
    };

    peersRef.current.set(userId, pc);
    return pc;
  }, [localStream]);

  // Автоматическое подключение к голосовому каналу при изменении channelId
  const connectToVoiceChannel = useCallback(async () => {
    if (!channelId || channelRef.current) return; // Предотвращаем множественные подключения

    try {
      console.log('=== CONNECTING TO VOICE CHANNEL ===');
      console.log('Channel ID:', channelId);
      
      // УБИРАЕМ сложную логику с отдельными presence каналами
      // Просто подключаемся к голосовому каналу
      
      // Получаем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      setLocalStream(stream);
      setIsRecording(true);
      
      // Настраиваем Voice Activity Detection
      const audioContext = new AudioContext();
      setupVoiceActivityDetection(stream, audioContext);

      // Создаем канал для сигналинга
      const channel = supabase.channel(`voice_channel_${channelId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('Voice channel presence sync:', state);
          const users: VoiceUser[] = Object.values(state).flat().map((presence: any) => ({
            user_id: presence.user_id,
            username: presence.username,
            isMuted: presence.isMuted || false,
            isSpeaking: false
          }));
          console.log('Connected users:', users);
          setConnectedUsers(users);
        })
        .on('presence', { event: 'join' }, async ({ newPresences }) => {
          console.log('User joined voice channel:', newPresences);
          // Создаем соединение с новым пользователем
          for (const presence of newPresences) {
            if (presence.user_id !== (await supabase.auth.getUser()).data.user?.id) {
              await createPeerConnection(presence.user_id);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left voice channel:', leftPresences);
          // Закрываем соединения с ушедшими пользователями
          leftPresences.forEach((presence: any) => {
            const pc = peersRef.current.get(presence.user_id);
            if (pc) {
              pc.close();
              peersRef.current.delete(presence.user_id);
            }
            
            const audioElement = audioElementsRef.current.get(presence.user_id);
            if (audioElement) {
              audioElement.srcObject = null;
              audioElementsRef.current.delete(presence.user_id);
            }
          });
        })
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          const { offer, from } = payload;
          const pc = await createPeerConnection(from);
          
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: {
              answer,
              from: (await supabase.auth.getUser()).data.user?.id,
              to: from
            }
          });
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          const { answer, from } = payload;
          const pc = peersRef.current.get(from);
          if (pc) {
            await pc.setRemoteDescription(answer);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          const { candidate, from } = payload;
          const pc = peersRef.current.get(from);
          if (pc) {
            await pc.addIceCandidate(candidate);
          }
        })
        .subscribe(async (status) => {
          console.log('Voice channel subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to voice channel');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              console.log('Current user:', user.id);
              // Получаем профиль пользователя
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, display_name')
                .eq('user_id', user.id)
                .maybeSingle();
              
              if (profileError) {
                console.error('Error fetching profile:', profileError);
              }
              
              const username = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
              
              console.log('Tracking user presence:', { user_id: user.id, username, isMuted });
              
              // Присоединяемся к голосовому каналу
              const trackResult = await channel.track({
                user_id: user.id,
                username: username,
                isMuted: isMuted,
                joined_at: new Date().toISOString()
              });
              
              console.log('=== VOICE CHANNEL SUBSCRIBED ===');
              console.log('User ID:', user.id);
              console.log('Channel ID:', channelId);
              setIsConnected(true);
              
              // НЕМЕДЛЕННО обновляем presence
              console.log('Immediately updating voice presence...');
              setTimeout(() => {
                updateVoicePresence(false);
              }, 1000); // Даем секунду на подключение
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error occurred');
          } else if (status === 'TIMED_OUT') {
            console.error('Channel subscription timed out');
          } else if (status === 'CLOSED') {
            console.error('Channel subscription closed');
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error connecting to voice channel:', error);
    }
  }, [channelId, isMuted, setupVoiceActivityDetection, updateVoicePresence]);

  // Отключение от голосового канала
  const disconnectFromVoiceChannel = useCallback(async () => {
    // Закрываем все peer соединения
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    
    // Останавливаем аудио элементы
    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();
    
    // Останавливаем локальный поток
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Отключаемся от каналов
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    // Очищаем presence для sidebar
    if (voicePresenceRef.current) {
      console.log('Clearing voice presence from sidebar...');
      await voicePresenceRef.current.untrack();
      voicePresenceRef.current.unsubscribe();
      voicePresenceRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setConnectedUsers([]);
    setIsSpeaking(false);
  }, [localStream]);

  // Переключение мута
  const toggleMute = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Обновляем статус в каналах
        await updateVoicePresence(isSpeaking);
        
        // Обновляем статус в обычном канале
        if (channelRef.current) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Получаем профиль пользователя
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name')
              .eq('user_id', user.id)
              .maybeSingle();
            
            const username = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
            
            await channelRef.current.track({
              user_id: user.id,
              username: username,
              isMuted: !audioTrack.enabled,
              joined_at: new Date().toISOString()
            });
          }
        }
      }
    }
  }, [localStream, isSpeaking, updateVoicePresence]);

  // Инициация соединения с другими пользователями
  const initiateConnections = useCallback(async () => {
    if (!channelRef.current) return;
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const currentUsers = connectedUsers.filter((user) => {
      return user.user_id !== currentUser?.id;
    });
    
    for (const user of currentUsers) {
      if (!peersRef.current.has(user.user_id)) {
        const pc = await createPeerConnection(user.user_id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            offer,
            from: currentUser?.id,
            to: user.user_id
          }
        });
      }
    }
  }, [connectedUsers, createPeerConnection]);

  useEffect(() => {
    if (isConnected && connectedUsers.length > 1) {
      initiateConnections();
    }
  }, [isConnected, connectedUsers, initiateConnections]);

  // Автоматическое подключение при изменении channelId
  useEffect(() => {
    // Очищаем предыдущее соединение
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    if (voicePresenceRef.current) {
      voicePresenceRef.current.unsubscribe();
      voicePresenceRef.current = null;
    }
    
    // Подключаемся только если есть channelId
    if (channelId) {
      connectToVoiceChannel();
    }
    
    // Отключаемся при размонтировании или смене канала
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      // Очищаем presence при выходе
      if (voicePresenceRef.current) {
        voicePresenceRef.current.untrack();
        voicePresenceRef.current.unsubscribe();
        voicePresenceRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setIsConnected(false);
      setIsRecording(false);
      setIsSpeaking(false);
      setConnectedUsers([]);
    };
  }, [channelId]);

  return {
    isConnected,
    isRecording,
    isMuted,
    isSpeaking,
    connectedUsers,
    disconnectFromVoiceChannel,
    toggleMute
  };
};