export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  context.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Uint8Array(analyser.fftSize);
  const state = { chunks: [] as Blob[], frame: 0, speech: false, silence: 0, stopped: false };
  const stop = () => {
    if (state.stopped) return;
    state.stopped = true;
    cancelAnimationFrame(state.frame);
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  const result = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) state.chunks = [...state.chunks, event.data];
    });
    recorder.addEventListener('stop', () => resolve(new Blob(state.chunks, { type: recorder.mimeType })));
    recorder.addEventListener('error', () => {
      stop();
      reject(new Error('Recording failed'));
    });
  });
  const started = performance.now();
  const monitor = () => {
    analyser.getByteTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / buffer.length);
    const now = performance.now();
    if (rms > 0.02) {
      state.speech = true;
      state.silence = 0;
    } else if (state.speech && !state.silence) state.silence = now;
    if ((state.silence && now - state.silence > 1200) || now - started > 15000) stop();
    else state.frame = requestAnimationFrame(monitor);
  };
  recorder.start();
  state.frame = requestAnimationFrame(monitor);
  return { stop, result };
}
