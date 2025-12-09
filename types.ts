export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'USER' | 'AI' | 'SYSTEM';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SystemResource {
  name: string;
  usage: number; // 0-100
  temp?: number;
}

// Function Declaration Types
export interface SystemCommandArgs {
  action: 'close' | 'open' | 'minimize' | 'maximize';
  target: string;
}
