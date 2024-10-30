import { EventEmitter } from 'events';
import { Logger } from './logger';

interface CallMetrics {
  latency: number;
  packetLoss: number;
  audioQuality: number;
}

export class CallMonitor extends EventEmitter {
  private metrics: Map<string, CallMetrics>;
  private logger: Logger;
  private readonly LATENCY_THRESHOLD = 300; // ms
  private readonly PACKET_LOSS_THRESHOLD = 0.05; // 5%

  constructor() {
    super();
    this.metrics = new Map();
    this.logger = new Logger();
  }

  public startMonitoring(callId: string) {
    this.metrics.set(callId, {
      latency: 0,
      packetLoss: 0,
      audioQuality: 100,
    });
  }

  public updateMetrics(callId: string, metrics: Partial<CallMetrics>) {
    const currentMetrics = this.metrics.get(callId);
    if (currentMetrics) {
      const updatedMetrics = { ...currentMetrics, ...metrics };
      this.metrics.set(callId, updatedMetrics);
      this.checkThresholds(callId, updatedMetrics);
    }
  }

  private checkThresholds(callId: string, metrics: CallMetrics) {
    if (metrics.latency > this.LATENCY_THRESHOLD) {
      this.emit('high-latency', { callId, latency: metrics.latency });
      this.logger.warn(`High latency detected in call ${callId}`, { metrics });
    }

    if (metrics.packetLoss > this.PACKET_LOSS_THRESHOLD) {
      this.emit('packet-loss', { callId, packetLoss: metrics.packetLoss });
      this.logger.warn(`High packet loss detected in call ${callId}`, { metrics });
    }
  }

  public getMetrics(callId: string): CallMetrics | undefined {
    return this.metrics.get(callId);
  }

  public stopMonitoring(callId: string) {
    this.metrics.delete(callId);
  }
}