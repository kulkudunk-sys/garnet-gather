import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log("WebSocket connection established");
    
    // Connect to OpenAI Realtime API
    const openAISocket = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      {
        headers: {
          "Authorization": `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    let sessionConfigured = false;

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("OpenAI -> Client:", data.type);

      // Configure session after receiving session.created
      if (data.type === 'session.created' && !sessionConfigured) {
        console.log("Configuring session...");
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: "Ты голосовой помощник в Discord-подобном мессенджере. Отвечай кратко и дружелюбно. Помогай пользователям в общении.",
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: "function",
                name: "send_message_to_channel",
                description: "Отправить сообщение в текстовый канал",
                parameters: {
                  type: "object",
                  properties: {
                    message: { type: "string", description: "Текст сообщения для отправки" },
                    channel_id: { type: "string", description: "ID канала для отправки" }
                  },
                  required: ["message"]
                }
              }
            ],
            tool_choice: "auto",
            temperature: 0.8,
            max_response_output_tokens: "inf"
          }
        };
        
        openAISocket.send(JSON.stringify(sessionConfig));
        sessionConfigured = true;
      }

      // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        console.log("Function call:", data.arguments);
        try {
          const args = JSON.parse(data.arguments);
          if (data.name === 'send_message_to_channel') {
            // Send function result back to OpenAI
            const functionResult = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: data.call_id,
                output: JSON.stringify({ success: true, message: "Сообщение отправлено в канал" })
              }
            };
            openAISocket.send(JSON.stringify(functionResult));
            openAISocket.send(JSON.stringify({ type: "response.create" }));
          }
        } catch (e) {
          console.error("Error parsing function arguments:", e);
        }
      }

      // Forward message to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({ 
        type: "error", 
        message: "Ошибка подключения к голосовому помощнику" 
      }));
    };

    openAISocket.onclose = (event) => {
      console.log("OpenAI connection closed:", event.code, event.reason);
      socket.close();
    };

    // Handle messages from client
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Client -> OpenAI:", data.type);
        
        // Forward client messages to OpenAI
        openAISocket.send(event.data);
      } catch (error) {
        console.error("Error handling client message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Client disconnected");
      openAISocket.close();
    };

    return response;
  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response("WebSocket setup failed", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});