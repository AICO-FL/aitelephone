export interface CallSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
}

export interface Conversation {
  id: string;
  sessionId: string;
  timestamp: Date;
  userInput: string;
  aiResponse: string;
  audioUrl?: string;
}

export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  applicationId: string;
  privateKey: string;
}

export interface DifyConfig {
  apiKey: string;
  apiEndpoint: string;
}

export interface GoogleCloudConfig {
  projectId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}