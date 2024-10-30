import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { DifyConfig } from '../types';
import { Logger } from './logger';

interface DifyResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
}

interface StreamChunk {
  event: string;
  data: string;
}

export class DifyService extends EventEmitter {
  private client: AxiosInstance;
  private logger: Logger;
  private conversationContexts: Map<string, string[]>;
  private readonly MAX_CONTEXT_LENGTH = 10;

  constructor(config: DifyConfig) {
    super();
    this.logger = new Logger();
    this.conversationContexts = new Map();
    
    this.client = axios.create({
      baseURL: config.apiEndpoint,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupAxiosInterceptors();
  }

  private setupAxiosInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Dify API error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  public async generateResponse(
    userInput: string,
    conversationId?: string,
    callId?: string
  ): Promise<string> {
    try {
      // Get conversation context
      const context = this.getConversationContext(conversationId);

      const response = await this.client.post<DifyResponse>('/chat-messages', {
        inputs: {},
        query: userInput,
        conversation_id: conversationId,
        response_mode: 'streaming',
        user: callId, // Track user by call ID
        conversation_context: context,
      });

      // Update context with new interaction
      this.updateConversationContext(conversationId, {
        user: userInput,
        assistant: response.data.answer,
      });

      return response.data.answer;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  public async streamResponse(
    userInput: string,
    conversationId?: string,
    callId?: string
  ): Promise<AsyncGenerator<string>> {
    const context = this.getConversationContext(conversationId);

    const response = await this.client.post('/chat-messages', {
      inputs: {},
      query: userInput,
      conversation_id: conversationId,
      response_mode: 'streaming',
      user: callId,
      conversation_context: context,
    }, {
      responseType: 'stream',
    });

    return this.processStream(response.data);
  }

  private async *processStream(stream: NodeJS.ReadableStream): AsyncGenerator<string> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          const { event, data } = JSON.parse(line) as StreamChunk;
          if (event === 'message' && data) {
            yield data;
          }
        } catch (error) {
          this.logger.error('Error parsing stream chunk', { error, line });
        }
      }
    }
  }

  private getConversationContext(conversationId?: string): string[] {
    if (!conversationId) return [];
    return this.conversationContexts.get(conversationId) || [];
  }

  private updateConversationContext(
    conversationId: string | undefined,
    interaction: { user: string; assistant: string }
  ) {
    if (!conversationId) return;

    const context = this.getConversationContext(conversationId);
    context.push(
      `User: ${interaction.user}`,
      `Assistant: ${interaction.assistant}`
    );

    // Keep only recent context
    while (context.length > this.MAX_CONTEXT_LENGTH) {
      context.shift();
    }

    this.conversationContexts.set(conversationId, context);
  }

  public async createConversation(callId: string): Promise<string> {
    try {
      const response = await this.client.post('/conversations', {
        user: callId,
      });

      return response.data.conversation_id;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  public async endConversation(conversationId: string): Promise<void> {
    try {
      await this.client.delete(`/conversations/${conversationId}`);
      this.conversationContexts.delete(conversationId);
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  private handleApiError(error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      if (error.response?.status === 400) {
        throw new Error('Invalid request parameters');
      }
    }
    throw error;
  }

  public async getMessageHistory(conversationId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/messages/${conversationId}`);
      return response.data.messages;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }
}