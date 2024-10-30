import { Transform } from 'stream';

export class AudioProcessor extends Transform {
  private readonly frameSize: number;
  private buffer: Buffer;

  constructor(options: { frameSize: number }) {
    super({ objectMode: true });
    this.frameSize = options.frameSize;
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    // Append new data to existing buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Process complete frames
    while (this.buffer.length >= this.frameSize) {
      const frame = this.buffer.slice(0, this.frameSize);
      this.buffer = this.buffer.slice(this.frameSize);
      this.push(frame);
    }

    callback();
  }

  _flush(callback: Function) {
    // Handle any remaining data
    if (this.buffer.length > 0) {
      // Pad the last frame if necessary
      if (this.buffer.length < this.frameSize) {
        const padding = Buffer.alloc(this.frameSize - this.buffer.length);
        this.buffer = Buffer.concat([this.buffer, padding]);
      }
      this.push(this.buffer);
    }
    callback();
  }

  public static async normalizeAudio(buffer: Buffer): Promise<Buffer> {
    // Simple audio normalization
    const samples = new Int16Array(buffer.buffer);
    let maxAmplitude = 0;

    // Find maximum amplitude
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxAmplitude) {
        maxAmplitude = abs;
      }
    }

    // Normalize if necessary
    if (maxAmplitude > 0) {
      const normalizedSamples = new Int16Array(samples.length);
      const scale = 32767 / maxAmplitude;

      for (let i = 0; i < samples.length; i++) {
        normalizedSamples[i] = Math.floor(samples[i] * scale);
      }

      return Buffer.from(normalizedSamples.buffer);
    }

    return buffer;
  }
}