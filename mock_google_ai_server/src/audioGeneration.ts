// Mock audio data - base64 encoded PCM payloads (reused WAV beep samples)
export const AUDIO_SAMPLES = {
  german: 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBC+Ezm4',
  hungarian: 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBCmEzmo',
};

export class AudioGenerationHandler {
  private audioCallCounter = 0;

  reset(): void {
    this.audioCallCounter = 0;
  }

  generateAudio(prompt: string, voiceName?: string): string {
    this.audioCallCounter++;

    const isHungarian = /Hungarian/i.test(prompt);
    const audioBase64 = isHungarian ? AUDIO_SAMPLES.hungarian : AUDIO_SAMPLES.german;

    console.log(
      `Generated TTS audio for prompt: "${prompt}" (language: ${isHungarian ? 'hu' : 'de'}, voice: ${voiceName ?? 'unknown'})`
    );

    return audioBase64;
  }

  getCallCount(): number {
    return this.audioCallCounter;
  }
}
