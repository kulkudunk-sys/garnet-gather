import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioRecorder, AudioQueue, encodeAudioForAPI } from '@/lib/audioUtils';

export interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
}

export const useVoiceChat = (channelId: string) => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  // Initialize audio context and queue
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        await audioContextRef.current.resume();
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
        console.log("Audio system initialized");
      } catch (error) {
        console.error("Failed to initialize audio:", error);
      }
    };
    
    initAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Connect to voice chat WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log("Connecting to voice chat...");
    const ws = new WebSocket(`wss://wlbgfqyfcxsoveflmxsi.functions.supabase.co/functions/v1/voice-chat`);
    
    ws.onopen = () => {
      console.log("Voice chat connected");
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data.type);

        switch (data.type) {
          case 'response.audio.delta':
            if (audioQueueRef.current && data.delta) {
              // Convert base64 to Uint8Array
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await audioQueueRef.current.addToQueue(bytes);
            }
            break;

          case 'response.audio_transcript.delta':
            if (data.delta) {
              setCurrentTranscript(prev => prev + data.delta);
            }
            break;

          case 'response.audio_transcript.done':
            if (currentTranscript.trim()) {
              setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                type: 'assistant',
                content: currentTranscript.trim(),
                timestamp: new Date(),
                isAudio: true
              }]);
              setCurrentTranscript('');
            }
            break;

          case 'response.created':
            setIsSpeaking(true);
            break;

          case 'response.done':
            setIsSpeaking(false);
            break;

          case 'input_audio_buffer.speech_started':
            console.log("Speech started");
            break;

          case 'input_audio_buffer.speech_stopped':
            console.log("Speech stopped");
            break;

          case 'error':
            console.error("Voice chat error:", data.message);
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("Voice chat disconnected");
      setIsConnected(false);
      setIsRecording(false);
      setIsSpeaking(false);
    };

    wsRef.current = ws;
  }, [currentTranscript]);

  // Disconnect from voice chat
  const disconnect = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
  }, []);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    try {
      audioRecorderRef.current = new AudioRecorder((audioData: Float32Array) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, []);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      console.log("Recording stopped");
    }
  }, []);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    // Add user message to chat
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
      isAudio: false
    }]);

    // Send to OpenAI
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };
    
    wsRef.current.send(JSON.stringify(event));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, []);

  return {
    messages,
    isConnected,
    isRecording,
    isSpeaking,
    currentTranscript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage
  };
};