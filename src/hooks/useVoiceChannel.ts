import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { trackVoiceUser, untrackVoiceUser } from '@/lib/voicePresenceManager';
import { useWebRTCConnections } from '@/hooks/useWebRTCConnections';

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
  console.log('=== useVoiceChannel HOOK LOADED ===', new Date().toISOString());
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
  const isSpeakingRef = useRef<boolean>(false);

  // Подключаем новый WebRTC хук для принудительного создания connections
  const { peersRef: webrtcPeersRef, audioElementsRef: webrtcAudioRef } = useWebRTCConnections(channelId, connectedUsers, localStream);

  // ПРОСТОЕ И РАБОЧЕЕ обновление presence через глобальный менеджер
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
    
    // Отправляем данные через глобальный менеджер
    const presenceData = {
      user_id: user.id,
      username: username,
      channel_id: channelId,
      isMuted: isMuted,
      isSpeaking: speaking,
      joined_at: new Date().toISOString()
    };
    
    console.log('=== UPDATING VOICE PRESENCE VIA MANAGER ===');
    console.log('Presence data:', presenceData);
    
    await trackVoiceUser(presenceData);
  }, [channelId, isMuted]);

  // Voice Activity Detection с правильной логикой
  const setupVoiceActivityDetection = useCallback((stream: MediaStream, audioContext: AudioContext) => {
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;
    microphone.connect(analyser);
    
    analyserRef.current = analyser;
    
    let speakingStartTime = 0;
    let silenceStartTime = 0;
    const SPEAKING_THRESHOLD = 3; // Понижаем порог
    const SILENCE_THRESHOLD = 1;  // Порог для молчания
    const MIN_SPEAKING_TIME = 300; // Минимум 300мс речи
    const MIN_SILENCE_TIME = 800;  // Минимум 800мс молчания для отключения
    
    const detectVoiceActivity = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      const currentTime = Date.now();
      const isLoudEnough = volume > SPEAKING_THRESHOLD;
      const isQuiet = volume < SILENCE_THRESHOLD;
      
      // Логика для определения начала речи
      if (isLoudEnough && !isSpeakingRef.current) {
        if (speakingStartTime === 0) {
          speakingStartTime = currentTime;
        } else if (currentTime - speakingStartTime > MIN_SPEAKING_TIME) {
          console.log('=== STARTED SPEAKING ===', 'Volume:', volume);
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          updateVoicePresence(true);
          speakingStartTime = 0;
          silenceStartTime = 0;
        }
      }
      
      // Логика для определения конца речи
      if (isQuiet && isSpeakingRef.current) {
        if (silenceStartTime === 0) {
          silenceStartTime = currentTime;
        } else if (currentTime - silenceStartTime > MIN_SILENCE_TIME) {
          console.log('=== STOPPED SPEAKING ===', 'Volume:', volume);
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          updateVoicePresence(false);
          silenceStartTime = 0;
          speakingStartTime = 0;
        }
      }
      
      // Сброс таймеров если условия не выполняются
      if (!isLoudEnough && !isSpeakingRef.current) {
        speakingStartTime = 0;
      }
      if (!isQuiet && isSpeakingRef.current) {
        silenceStartTime = 0;
      }
      
      // Логирование только каждые 50 фреймов для читаемости
      if (Math.random() < 0.02) {
        console.log(`Voice: ${volume.toFixed(1)} | Speaking: ${isSpeaking} | Loud: ${isLoudEnough} | Quiet: ${isQuiet}`);
      }
      
      requestAnimationFrame(detectVoiceActivity);
    };
    
    detectVoiceActivity();
  }, [isSpeaking, updateVoicePresence]);

  // Создание RTCPeerConnection для пользователя
  const createPeerConnection = useCallback(async (userId: string): Promise<RTCPeerConnection> => {
    console.log('=== CREATING PEER CONNECTION ===');
    console.log('Target user ID:', userId);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Добавляем локальный аудио поток
    if (localStream) {
      console.log('Adding local tracks to peer connection');
      localStream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.enabled);
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn('No local stream available when creating peer connection');
    }

    // Обработка входящих аудио потоков
    pc.ontrack = (event) => {
      console.log('=== RECEIVED REMOTE TRACK ===');
      console.log('From user:', userId);
      console.log('Track kind:', event.track.kind);
      console.log('Track enabled:', event.track.enabled);
      
      const remoteStream = event.streams[0];
      
      let audioElement = audioElementsRef.current.get(userId);
      if (!audioElement) {
        console.log('Creating new audio element for user:', userId);
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.volume = 1.0;
        audioElementsRef.current.set(userId, audioElement);
        
        // Добавляем обработчики событий для отладки
        audioElement.onloadstart = () => console.log('Audio loading started for:', userId);
        audioElement.oncanplay = () => console.log('Audio can play for:', userId);
        audioElement.onplay = () => console.log('Audio started playing for:', userId);
        audioElement.onerror = (e) => console.error('Audio error for:', userId, e);
      }
      
      audioElement.srcObject = remoteStream;
      
      // Принудительно запускаем воспроизведение
      audioElement.play().catch(error => {
        console.error('Failed to play audio for user:', userId, error);
      });
    };

    // Обработка ICE кандидатов
    pc.onicecandidate = async (event) => {
      if (event.candidate && channelRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Sending ICE candidate from:', user?.id, 'to:', userId);
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: user?.id,
            to: userId
          }
        });
      }
    };

    // Отладка состояния соединения
    pc.onconnectionstatechange = () => {
      console.log('Connection state changed for user:', userId, 'state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed for user:', userId, 'state:', pc.iceConnectionState);
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
      
      // Проверяем доступность медиа устройств
      if (!navigator.mediaDevices) {
        console.warn('MediaDevices API недоступен. Голосовые каналы работают только через HTTPS.');
        return; // Тихо возвращаемся без ошибки
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia не поддерживается в этом браузере.');
        return; // Тихо возвращаемся без ошибки
      }

      // Проверяем протокол
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('Голосовые каналы работают только через HTTPS. Текущий протокол: ' + location.protocol);
        return; // Тихо возвращаемся без ошибки
      }
      
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
      console.log('=== CREATING VOICE CHANNEL ===', `voice_channel_${channelId}`);
      const channel = supabase.channel(`voice_channel_${channelId}`)
        .on('presence', { event: 'sync' }, async () => {
          const state = channel.presenceState();
          console.log('=== NEW VOICE CHANNEL PRESENCE SYNC ===');
          console.log('Presence state:', state);
          
          const users: VoiceUser[] = Object.values(state).flat().map((presence: any) => ({
            user_id: presence.user_id,
            username: presence.username,
            isMuted: presence.isMuted || false,
            isSpeaking: false
          }));
          console.log('Users from sync event:', users);
          setConnectedUsers(users);
          
          // ПРИНУДИТЕЛЬНО СОЗДАЕМ PEER CONNECTIONS
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          console.log('=== FORCING PEER CONNECTIONS FROM SYNC ===');
          console.log('Current user:', currentUser?.id);
          console.log('Total users to connect:', users.length);
          
          for (const user of users) {
            if (user.user_id !== currentUser?.id) {
              console.log('=== CREATING PEER CONNECTION IN SYNC ===');
              console.log('Target user:', user.user_id);
              try {
                await createPeerConnection(user.user_id);
                console.log('Peer connection created successfully for:', user.user_id);
              } catch (error) {
                console.error('Failed to create peer connection for:', user.user_id, error);
              }
            } else {
              console.log('Skipping self connection:', user.user_id);
            }
          }
        })
        .on('presence', { event: 'join' }, async ({ newPresences }) => {
          console.log('=== USER JOINED VOICE CHANNEL ===');
          console.log('New presences:', newPresences);
          
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          console.log('Current user ID:', currentUser?.id);
          
          // Создаем соединение с новым пользователем
          for (const presence of newPresences) {
            console.log('Processing presence:', presence);
            if (presence.user_id !== currentUser?.id) {
              console.log('Creating peer connection for user:', presence.user_id);
              await createPeerConnection(presence.user_id);
            } else {
              console.log('Skipping self:', presence.user_id);
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
              
              // ПРИНУДИТЕЛЬНО создаем connections через 3 секунды
              console.log('Setting up forced peer connection creation...');
              setTimeout(async () => {
                console.log('=== FORCING PEER CONNECTIONS CREATION ===');
                const currentState = channel.presenceState();
                console.log('Current presence state:', currentState);
                
                const allUsers = Object.values(currentState).flat();
                console.log('All users from state:', allUsers);
                
                for (const presence of allUsers as any[]) {
                  if (presence.user_id !== user.id) {
                    console.log('Force creating peer connection for:', presence.user_id);
                    await createPeerConnection(presence.user_id);
                  }
                }
              }, 3000);
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
    
    // Очищаем presence через глобальный менеджер
    console.log('Clearing voice presence via manager...');
    await untrackVoiceUser();
    
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
    console.log('=== INITIATING CONNECTIONS ===');
    
    if (!channelRef.current) {
      console.log('No channel reference, skipping connections');
      return;
    }
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log('Current user for connections:', currentUser?.id);
    console.log('All connected users:', connectedUsers);
    
    const currentUsers = connectedUsers.filter((user) => {
      return user.user_id !== currentUser?.id;
    });
    console.log('Other users to connect to:', currentUsers);
    
    for (const user of currentUsers) {
      console.log('Processing user connection:', user.user_id);
      
      if (!peersRef.current.has(user.user_id)) {
        console.log('Creating new peer connection and offer for:', user.user_id);
        const pc = await createPeerConnection(user.user_id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log('Sending offer to:', user.user_id);
        channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            offer,
            from: currentUser?.id,
            to: user.user_id
          }
        });
      } else {
        console.log('Peer connection already exists for:', user.user_id);
      }
    }
  }, [connectedUsers, createPeerConnection]);

  useEffect(() => {
    console.log('=== EFFECT: isConnected changed ===', isConnected);
    console.log('Connected users count:', connectedUsers.length);
    
    if (isConnected && connectedUsers.length > 1) {
      console.log('Triggering initiate connections...');
      // Небольшая задержка для стабилизации соединений
      setTimeout(() => {
        console.log('Executing initiate connections after delay');
        initiateConnections();
      }, 2000);
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
      // Очищаем presence при выходе через глобальный менеджер
      console.log('Cleaning up voice presence via manager...');
      untrackVoiceUser();
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