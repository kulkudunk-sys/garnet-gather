import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceUser {
  user_id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

export const useWebRTCConnections = (channelId: string | null, connectedUsers: VoiceUser[], localStream: MediaStream | null) => {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  console.log('=== WEBRTC CONNECTIONS HOOK INITIALIZED ===');

  const createPeerConnection = useCallback(async (userId: string): Promise<RTCPeerConnection> => {
    console.log('=== [WEBRTC] CREATING PEER CONNECTION ===');
    console.log('[WEBRTC] Target user:', userId);
    
    // Закрываем существующее соединение если есть
    const existingPc = peersRef.current.get(userId);
    if (existingPc) {
      console.log('[WEBRTC] Closing existing connection for:', userId);
      existingPc.close();
      peersRef.current.delete(userId);
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Добавляем локальный аудио поток
    if (localStream) {
      console.log('[WEBRTC] Adding local stream tracks');
      localStream.getTracks().forEach(track => {
        console.log('[WEBRTC] Adding track:', track.kind, 'enabled:', track.enabled);
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn('[WEBRTC] No local stream available!');
    }

    // Обработка входящих треков
    pc.ontrack = (event) => {
      console.log('=== [WEBRTC] RECEIVED REMOTE TRACK ===');
      console.log('[WEBRTC] From user:', userId);
      console.log('[WEBRTC] Track kind:', event.track.kind);
      
      const remoteStream = event.streams[0];
      
      let audioElement = audioElementsRef.current.get(userId);
      if (!audioElement) {
        console.log('[WEBRTC] Creating audio element for:', userId);
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.volume = 1.0;
        audioElementsRef.current.set(userId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
      audioElement.play().catch(error => {
        console.error('[WEBRTC] Audio play failed for:', userId, error);
      });
    };

    // ICE кандидаты  
    pc.onicecandidate = async (event) => {
      if (event.candidate && channelId) {
        console.log('[WEBRTC] Sending ICE candidate to:', userId);
        // Отправляем через Supabase channel
        // Здесь нужен доступ к voice channel
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] Connection state for', userId, ':', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ICE state for', userId, ':', pc.iceConnectionState);
    };

    peersRef.current.set(userId, pc);
    console.log('[WEBRTC] Peer connection stored for:', userId);
    return pc;
  }, [channelId, localStream]);

  // Принудительное создание connections при изменении пользователей
  useEffect(() => {
    if (!channelId || !localStream) {
      console.log('[WEBRTC] Skipping connections - no channel or stream');
      return;
    }

    console.log('=== [WEBRTC] PROCESSING USER CONNECTIONS ===');
    console.log('[WEBRTC] Channel:', channelId);
    console.log('[WEBRTC] Connected users:', connectedUsers.length);
    console.log('[WEBRTC] Local stream:', !!localStream);

    const processConnections = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('[WEBRTC] Current user:', currentUser?.id);

      for (const user of connectedUsers) {
        if (user.user_id !== currentUser?.id) {
          console.log('[WEBRTC] Creating connection for user:', user.user_id);
          try {
            await createPeerConnection(user.user_id);
            console.log('[WEBRTC] ✅ Connection created for:', user.user_id);
          } catch (error) {
            console.error('[WEBRTC] ❌ Failed to create connection for:', user.user_id, error);
          }
        }
      }
    };

    // Небольшая задержка для стабилизации
    const timeout = setTimeout(processConnections, 1000);
    return () => clearTimeout(timeout);
  }, [channelId, connectedUsers, localStream, createPeerConnection]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      console.log('[WEBRTC] Cleaning up connections');
      peersRef.current.forEach((pc, userId) => {
        console.log('[WEBRTC] Closing connection for:', userId);
        pc.close();
      });
      peersRef.current.clear();
      
      audioElementsRef.current.forEach((audio, userId) => {
        console.log('[WEBRTC] Removing audio element for:', userId);
        audio.srcObject = null;
      });
      audioElementsRef.current.clear();
    };
  }, []);

  return {
    peersRef,
    audioElementsRef,
    createPeerConnection
  };
};