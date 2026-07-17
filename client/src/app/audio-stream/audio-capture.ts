export interface AudioCapture {
  stop(): void;
}

const TARGET_SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

const toPcm16 = (input: Float32Array, ratio: number): ArrayBuffer => {
  const outLength = Math.floor(input.length / ratio);
  const output = Int16Array.from({ length: outLength }, (_, index) => {
    const sample = input[Math.floor(index * ratio)];
    const clamped = Math.max(-1, Math.min(1, sample));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  });
  return output.buffer;
};

export async function startAudioCapture(
  onPcm: (chunk: ArrayBuffer) => void
): Promise<AudioCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
  });
  stream.getVideoTracks().forEach((track) => track.stop());

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
  const ratio = audioContext.sampleRate / TARGET_SAMPLE_RATE;

  processor.addEventListener('audioprocess', (event) => {
    const input = event.inputBuffer.getChannelData(0);
    onPcm(toPcm16(input, ratio));
  });

  source.connect(processor);
  processor.connect(audioContext.destination);

  const stop = (): void => {
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext.state !== 'closed') {
      audioContext.close();
    }
  };

  return { stop };
}
