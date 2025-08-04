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
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

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

  // Подключение к голосовому каналу
  const connectToVoiceChannel = useCallback(async () => {
    if (!channelId) return;

    try {
      // Получаем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      setIsRecording(true);

      // Создаем канал для сигналинга
      const channel = supabase.channel(`voice_channel:${channelId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users: VoiceUser[] = Object.values(state).flat().map((presence: any) => ({
            user_id: presence.user_id,
            username: presence.username,
            isMuted: presence.isMuted || false,
            isSpeaking: false
          }));
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
          if (status === 'SUBSCRIBED') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Присоединяемся к голосовому каналу
              await channel.track({
                user_id: user.id,
                username: user.email?.split('@')[0] || 'User',
                isMuted: isMuted,
                joined_at: new Date().toISOString()
              });
              
              setIsConnected(true);
            }
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error connecting to voice channel:', error);
    }
  }, [channelId, isMuted, createPeerConnection]);

  // Отключение от голосового канала
  const disconnectFromVoiceChannel = useCallback(() => {
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
    
    // Отключаемся от канала
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setConnectedUsers([]);
  }, [localStream]);

  // Переключение мута
  const toggleMute = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Обновляем статус в канале
        if (channelRef.current) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channelRef.current.track({
              user_id: user.id,
              username: user.email?.split('@')[0] || 'User',
              isMuted: !audioTrack.enabled,
              joined_at: new Date().toISOString()
            });
          }
        }
      }
    }
  }, [localStream]);

  // Инициация соединения с другими пользователями
  const initiateConnections = useCallback(async () => {
    if (!channelRef.current) return;
    
    const currentUsers = connectedUsers.filter(async (user) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
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
            from: (await supabase.auth.getUser()).data.user?.id,
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

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnectFromVoiceChannel();
    };
  }, [disconnectFromVoiceChannel]);

  return {
    isConnected,
    isRecording,
    isMuted,
    connectedUsers,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
    toggleMute
  };
};