import { v4 as uuidv4 } from 'uuid';
import { VonageService } from '../services/vonage';
import { SpeechService } from '../services/speech';
import { DifyService } from '../services/dify';
import { DatabaseService } from '../services/database';
import { CallMonitor } from '../services/monitor';
import { ErrorHandler } from '../services/errorHandler';
import { AudioProcessor } from '../services/audioProcessor';
import { Logger } from '../services/logger';
import { config } from '../config';
import { CallSession, Conversation } from '../types';

export class CallController {
  private vonageService: VonageService;
  private speechService: SpeechService;
  private difyService: DifyService;
  private dbService: DatabaseService;
  private monitor: CallMonitor;
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private activeCalls: Map<string, { conversationId?: string }>;
  private audioProcessor: AudioProcessor;

  constructor() {
    this.vonageService = new VonageService(config.vonage);
    this.speechService = new SpeechService(config.googleCloud);
    this.difyService = new DifyService(config.dify);
    this.dbService = new DatabaseService(config.postgres.url, config.redis.url);
    this.monitor = new CallMonitor();
    this.errorHandler = new ErrorHandler();
    this.logger = new Logger();
    this.activeCalls = new Map();
    this.audioProcessor = new AudioProcessor({ frameSize: 640 });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.vonageService.on('audio', async (audioBuffer: Buffer, callId: string) => {
      await this.processUserInput(callId, audioBuffer);
    });

    this.vonageService.on('websocket:disconnected', async (callId: string) => {
      await this.handleCallDisconnection(callId);
    });

    this.vonageService.on('dtmf', async (data: { digit: string, callId: string }) => {
      await this.handleDTMF(data.callId, data.digit);
    });

    this.setupMonitorEventHandlers();
  }

  private setupMonitorEventHandlers() {
    this.monitor.on('high-latency', ({ callId, latency }) => {
      this.logger.warn(`High latency detected`, { callId, latency });
    });

    this.monitor.on('packet-loss', ({ callId, packetLoss }) => {
      this.logger.warn(`Packet loss detected`, { callId, packetLoss });
    });
  }

  public async handleIncomingCall(callId: string): Promise<void> {
    const session: CallSession = {
      id: callId,
      startTime: new Date(),
      status: 'active',
    };

    try {
      await this.dbService.saveSession(session);
      this.activeCalls.set(callId, {});
      this.monitor.startMonitoring(callId);
      this.logger.info(`Call started`, { callId });

      // Send initial greeting
      const greeting = 'ご用件をお聞かせください。';
      await this.sendAudioResponse(callId, greeting);
    } catch (error) {
      this.logger.error(`Error handling incoming call`, { error, callId });
      session.status = 'failed';
      session.endTime = new Date();
      await this.dbService.saveSession(session);
      throw error;
    }
  }

  private async processUserInput(
    callId: string,
    audioBuffer: Buffer
  ): Promise<void> {
    try {
      if (!this.activeCalls.has(callId)) return;

      // Normalize and process audio
      const processedAudio = await AudioProcessor.normalizeAudio(audioBuffer);
      
      // Convert speech to text
      const userInput = await this.errorHandler.handleError(
        new Error('Speech to text failed'),
        'speech-to-text',
        () => this.speechService.speechToText(processedAudio)
      );

      if (!userInput) return;

      // Get current conversation context
      const callData = this.activeCalls.get(callId)!;

      // Generate or retrieve response
      const aiResponse = await this.getAIResponse(userInput, callData.conversationId);

      // Convert to speech and send
      await this.sendAudioResponse(callId, aiResponse);

      // Update metrics
      this.monitor.updateMetrics(callId, {
        latency: Date.now() - new Date(callId).getTime(),
      });
    } catch (error) {
      this.logger.error(`Error processing user input`, { error, callId });
      
      // Send error message to user
      const errorMessage = 'すみません、一時的な問題が発生しました。もう一度お話しください。';
      await this.sendAudioResponse(callId, errorMessage);
    }
  }

  private async getAIResponse(
    userInput: string,
    conversationId?: string
  ): Promise<string> {
    const cachedResponse = await this.dbService.getCachedResponse(userInput);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const aiResponse = await this.errorHandler.handleError(
      new Error('Dify response generation failed'),
      'dify-response',
      () => this.difyService.generateResponse(userInput, conversationId)
    );

    await this.dbService.cacheResponse(userInput, aiResponse);
    return aiResponse;
  }

  private async sendAudioResponse(
    callId: string,
    text: string
  ): Promise<void> {
    const audioResponse = await this.errorHandler.handleError(
      new Error('Text to speech failed'),
      'text-to-speech',
      () => this.speechService.textToSpeech(text)
    );

    await this.vonageService.sendAudioToCall(callId, audioResponse);

    const conversation: Conversation = {
      id: uuidv4(),
      sessionId: callId,
      timestamp: new Date(),
      userInput: text,
      aiResponse: text,
    };

    await this.dbService.saveConversation(conversation);
  }

  private async handleCallDisconnection(callId: string): Promise<void> {
    try {
      const session: Partial<CallSession> = {
        id: callId,
        endTime: new Date(),
        status: 'completed',
      };
      await this.dbService.saveSession(session as CallSession);
      this.monitor.stopMonitoring(callId);
      this.activeCalls.delete(callId);
      this.logger.info(`Call ended`, { callId });
    } catch (error) {
      this.logger.error(`Error handling call disconnection`, { error, callId });
      throw error;
    }
  }

  private async handleDTMF(callId: string, digit: string): Promise<void> {
    // Handle DTMF tones if needed
    this.logger.info(`DTMF received`, { callId, digit });
  }
}