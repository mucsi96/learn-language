export interface ActiveRecording {
  readonly result: Promise<Blob>;
  stop(): void;
}

const SILENCE_THRESHOLD = 0.02;
const SILENCE_DURATION_MS = 1200;
const MAX_DURATION_MS = 15000;

export async function startRecording(): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const buffer = new Uint8Array(analyser.fftSize);

  let chunks: Blob[] = [];
  let rafId = 0;
  let stopped = false;
  let speechDetected = false;
  let silenceStart = 0;

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks = [...chunks, event.data];
    }
  });

  const result = new Promise<Blob>((resolve) => {
    recorder.addEventListener('stop', () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    });
  });

  const cleanup = () => {
    cancelAnimationFrame(rafId);
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext.state !== 'closed') {
      audioContext.close();
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const startTime = performance.now();

  const monitor = () => {
    analyser.getByteTimeDomainData(buffer);
    const rms = Math.sqrt(
      buffer.reduce((sum, value) => {
        const normalized = (value - 128) / 128;
        return sum + normalized * normalized;
      }, 0) / buffer.length
    );

    const now = performance.now();

    if (rms > SILENCE_THRESHOLD) {
      speechDetected = true;
      silenceStart = 0;
    } else if (speechDetected) {
      if (silenceStart === 0) {
        silenceStart = now;
      } else if (now - silenceStart > SILENCE_DURATION_MS) {
        stop();
        return;
      }
    }

    if (now - startTime > MAX_DURATION_MS) {
      stop();
      return;
    }

    rafId = requestAnimationFrame(monitor);
  };

  recorder.start();
  rafId = requestAnimationFrame(monitor);

  return { result, stop };
}
