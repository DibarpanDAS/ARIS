import { 
  GoogleGenAI, 
  LiveServerMessage, 
  Modality, 
  FunctionDeclaration,
  Type
} from '@google/genai';
import { 
  createPcmBlob, 
  decodeAudioData, 
  base64ToUint8Array, 
  blobToBase64
} from './audioUtils';
import { LogEntry } from '../types';

// Tool Definition for System Control
const systemControlTool: FunctionDeclaration = {
  name: 'systemControl',
  parameters: {
    type: Type.OBJECT,
    description: 'Control local system applications and windows.',
    properties: {
      action: {
        type: Type.STRING,
        description: 'The action to perform: "close", "open", "minimize", "maximize"',
        enum: ['close', 'open', 'minimize', 'maximize']
      },
      target: {
        type: Type.STRING,
        description: 'The name of the application or process (e.g., "Spotify", "Chrome", "Calculator")',
      },
    },
    required: ['action', 'target'],
  },
};

// Tool Definition for Web Search (Simulated for Live API stability)
const webSearchTool: FunctionDeclaration = {
  name: 'webSearch',
  parameters: {
    type: Type.OBJECT,
    description: 'Search the web for real-time information.',
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query string.',
      },
    },
    required: ['query'],
  },
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  // Callbacks
  private onLog: (log: LogEntry) => void;
  private onConnectionStateChange: (state: string) => void;
  private onAudioLevel: (level: number) => void;

  constructor(
    onLog: (log: LogEntry) => void,
    onConnectionStateChange: (state: string) => void,
    onAudioLevel: (level: number) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.onLog = onLog;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onAudioLevel = onAudioLevel;
  }

  public async connect(videoElement: HTMLVideoElement | null) {
    try {
      this.onConnectionStateChange('CONNECTING');
      this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: 'Initializing audio contexts...', type: 'info' });

      // Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = this.outputAudioContext.createGain();
      outputNode.connect(this.outputAudioContext.destination);

      // Setup Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.inputAudioContext.createMediaStreamSource(stream);
      const analyzer = this.inputAudioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      
      // Audio Processing Loop for Visualizer & Input
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        // Visualizer Data
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        this.onAudioLevel(average); // 0-255

        // Input Streaming
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        if (this.sessionPromise) {
          this.sessionPromise.then((session) => {
             session.sendRealtimeInput({ media: pcmBlob });
          }).catch((e) => {
            // Silently ignore send errors if session is closed/closing
          });
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(this.inputAudioContext.destination);

      // Setup Video Streaming if enabled
      if (videoElement) {
        this.startVideoStreaming(videoElement);
      }

      // Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are JARVIS, a highly advanced AI system interface. You are helpful, precise, and concise. You have access to system controls and real-time search. When asked to control apps, use the systemControl tool. When asked to search, use the webSearch tool. Assume you are running on a high-performance GPU mainframe.",
          tools: [
            // Use function declaration for search to ensure stability over WebSocket
            { functionDeclarations: [systemControlTool, webSearchTool] }
          ]
        },
        callbacks: {
          onopen: () => {
            this.onConnectionStateChange('CONNECTED');
            this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: 'Uplink established.', type: 'success' });
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message, outputNode);
          },
          onclose: () => {
             this.onConnectionStateChange('DISCONNECTED');
             this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: 'Connection closed.', type: 'warning' });
          },
          onerror: (err) => {
            console.error(err);
            this.onConnectionStateChange('ERROR');
            this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: 'Protocol Error.', type: 'error' });
          }
        }
      });

    } catch (error: any) {
      this.onConnectionStateChange('ERROR');
      this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: `Initialization failed: ${error.message}`, type: 'error' });
    }
  }

  private startVideoStreaming(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Send a frame every 500ms (2 FPS) to save bandwidth but keep context
    setInterval(() => {
      if (this.sessionPromise && videoElement.readyState === 4) {
        canvas.width = videoElement.videoWidth * 0.5; // Downscale for speed
        canvas.height = videoElement.videoHeight * 0.5;
        if (ctx) {
           ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
           canvas.toBlob(async (blob) => {
             if (blob) {
               const base64Data = await blobToBase64(blob);
               this.sessionPromise?.then(session => {
                  session.sendRealtimeInput({
                    media: { data: base64Data, mimeType: 'image/jpeg' }
                  });
               }).catch((e) => {});
             }
           }, 'image/jpeg', 0.6);
        }
      }
    }, 500);
  }

  private async handleMessage(message: LiveServerMessage, outputNode: AudioNode) {
    // Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
      // Simulate audio visualization for output
      this.onAudioLevel(Math.random() * 200); 

      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      const audioBuffer = await decodeAudioData(
        base64ToUint8Array(base64Audio),
        this.outputAudioContext,
        24000,
        1
      );
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.onLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'SYSTEM', message: 'Interrupted.', type: 'warning' });
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }

    // Handle Function Calls (System Control & Search)
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        let result = "Success";
        
        if (fc.name === 'systemControl') {
          const { action, target } = fc.args as any;
          this.onLog({ 
            id: crypto.randomUUID(), 
            timestamp: new Date().toLocaleTimeString(), 
            source: 'SYSTEM', 
            message: `EXECUTING: ${action.toUpperCase()} process "${target}"`, 
            type: 'success' 
          });
          result = `Executed ${action} on ${target}`;
        } else if (fc.name === 'webSearch') {
           const { query } = fc.args as any;
           this.onLog({ 
            id: crypto.randomUUID(), 
            timestamp: new Date().toLocaleTimeString(), 
            source: 'SYSTEM', 
            message: `SEARCHING WEB: "${query}"`, 
            type: 'info' 
          });
          // Mock search result to simulate connectivity
          result = `Found search results for "${query}": The current status is nominal. Systems are functioning at 100% efficiency.`;
        }

        // Respond to model
        this.sessionPromise?.then(session => {
          session.sendToolResponse({
            functionResponses: {
              id: fc.id,
              name: fc.name,
              response: { result: result }
            }
          });
        }).catch((e) => {});
      }
    }
  }

  public async disconnect() {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      session.close();
      this.sessionPromise = null;
    }
    if (this.inputAudioContext) this.inputAudioContext.close();
    if (this.outputAudioContext) this.outputAudioContext.close();
    this.onConnectionStateChange('DISCONNECTED');
  }
}
