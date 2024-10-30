import { Transform } from 'stream';

export class AudioBufferService {
  private readonly MAX_BUFFER_SIZE = 1024 * 1024; // 1MB
  private readonly CHUNK_SIZE = 640; // 16kHz 20ms frame
  private buffer: Buffer[];
  private totalSize: number;

  constructor() {
    this.buffer = [];
    this.totalSize = 0;
  }

  public addChunk(chunk: Buffer): Buffer[] {
    this.totalSize += chunk.length;
    this.buffer.push(chunk);

    // バッファサイズが上限を超えた場合、古いチャンクを削除
    while (this.totalSize > this.MAX_BUFFER_SIZE) {
      const removed = this.buffer.shift();
      if (removed) {
        this.totalSize -= removed.length;
      }
    }

    // 完全なフレームが揃った場合に処理
    const frames: Buffer[] = [];
    while (this.hasCompleteFrame()) {
      const frame = this.getNextFrame();
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  private hasCompleteFrame(): boolean {
    return this.totalSize >= this.CHUNK_SIZE;
  }

  private getNextFrame(): Buffer | null {
    if (!this.hasCompleteFrame()) return null;

    let frameSize = 0;
    let frameBuffers: Buffer[] = [];

    while (frameSize < this.CHUNK_SIZE) {
      const chunk = this.buffer[0];
      const remaining = this.CHUNK_SIZE - frameSize;

      if (chunk.length <= remaining) {
        frameBuffers.push(chunk);
        frameSize += chunk.length;
        this.totalSize -= chunk.length;
        this.buffer.shift();
      } else {
        const frameChunk = chunk.slice(0, remaining);
        const restChunk = chunk.slice(remaining);
        frameBuffers.push(frameChunk);
        this.buffer[0] = restChunk;
        this.totalSize -= remaining;
        frameSize += remaining;
      }
    }

    return Buffer.concat(frameBuffers);
  }

  public clear(): void {
    this.buffer = [];
    this.totalSize = 0;
  }
}