// Mock audio data - base64 encoded WAV files (simple beep sounds)
// These are minimal WAV files for testing purposes
export const AUDIO_SAMPLES = {
  german: 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBC+Ezm4',
  hungarian: 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBCmEzmo',
};

export const MOCK_VOICES = {
  voices: [
    {
      voice_id: 'test-voice-de',
      name: 'Test Voice DE',
      category: 'premade',
      labels: { language: 'de' },
      verified_languages: [{ language: 'de' }],
    },
    {
      voice_id: 'test-voice-hu',
      name: 'Test Voice HU',
      category: 'cloned',
      labels: { language: 'hu' },
      verified_languages: [{ language: 'hu' }],
    },
    {
      voice_id: 'test-voice-multilang',
      name: 'Multilingual Voice',
      category: 'premade',
      labels: {},
      verified_languages: [{ language: 'de' }, { language: 'hu' }],
    },
  ],
};

export class AudioGenerationHandler {
  private audioCallCounter = 0;

  reset(): void {
    this.audioCallCounter = 0;
  }

  generateAudio(text: string, voiceId: string, languageCode?: string): Buffer {
    this.audioCallCounter++;

    // Determine which audio sample to return based on language or voice
    let audioBase64 = ''

    if (languageCode) {
      switch (languageCode.toLowerCase()) {
        case 'de':
          audioBase64 = AUDIO_SAMPLES.german;
          break;
        case 'hu':
          audioBase64 = AUDIO_SAMPLES.hungarian;
          break;
      }
    }

    console.log(`Generated audio for text: "${text}" (language: ${languageCode || 'auto'}, voice: ${voiceId})`);

    return Buffer.from(audioBase64, 'base64');
  }

  getCallCount(): number {
    return this.audioCallCounter;
  }
}
