const SAMPLE_RATE = 24000;
const BEEP_DURATION_SECONDS = 0.3;
const BEEP_AMPLITUDE = 12000;

// Raw 16-bit PCM mono sine beeps, matching the format Gemini TTS returns
const generatePcmBeep = (frequency: number): string => {
  const sampleCount = Math.floor(SAMPLE_RATE * BEEP_DURATION_SECONDS);
  const samples = Int16Array.from({ length: sampleCount }, (_, i) =>
    Math.round(Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE) * BEEP_AMPLITUDE)
  );
  return Buffer.from(samples.buffer).toString('base64');
};

export const AUDIO_SAMPLES = {
  german: generatePcmBeep(440),
  hungarian: generatePcmBeep(660),
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
