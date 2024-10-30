import { SpeechClient } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleCloudConfig } from '../types';

export class SpeechService {
  private sttClient: SpeechClient;
  private ttsClient: TextToSpeechClient;

  constructor(config: GoogleCloudConfig) {
    this.sttClient = new SpeechClient({
      projectId: config.projectId,
      credentials: config.credentials,
    });

    this.ttsClient = new TextToSpeechClient({
      projectId: config.projectId,
      credentials: config.credentials,
    });
  }

  public async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      const [response] = await this.sttClient.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'ja-JP',
        },
      });

      return response.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .join(' ') || '';
    } catch (error) {
      console.error('Error in speech-to-text conversion:', error);
      throw error;
    }
  }

  public async textToSpeech(text: string): Promise<Buffer> {
    try {
      const [response] = await this.ttsClient.synthesizeSpeech({
        input: { text },
        voice: { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B' },
        audioConfig: { audioEncoding: 'MP3' },
      });

      return response.audioContent as Buffer;
    } catch (error) {
      console.error('Error in text-to-speech conversion:', error);
      throw error;
    }
  }
}