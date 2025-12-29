import express from 'express';
import { AudioGenerationHandler, MOCK_VOICES } from './audioGeneration';

const app = express();
const audioHandler = new AudioGenerationHandler();

app.use(express.json());

// Middleware to log access details
app.use((req, res, next) => {
  // Skip logging for health endpoint
  if (req.url !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  next();
});

// Add route to reset state for tests
app.post('/reset', (req, res) => {
  audioHandler.reset();
  console.log('Reset audio call counter to 0');
  res.status(200).json({ status: 'ok', message: 'Audio call counter reset to 0' });
});

// Eleven Labs TTS API endpoint - mock response
app.post('/v1/text-to-speech/:voiceId', (req, res) => {
  try {
    const { voiceId } = req.params;
    const { text, language_code } = req.body;
    
    console.log({ voiceId, text, language_code });
    
    const audioBuffer = audioHandler.generateAudio(text, voiceId, language_code);
    
    // Set appropriate headers for audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.status(200).send(audioBuffer);
    
    console.log(`Audio generated successfully (${audioBuffer.length} bytes)`);
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({ 
      detail: { 
        message: 'Audio generation failed',
        status: 'error'
      }
    });
  }
});

// Get call statistics (useful for testing)
app.get('/stats', (req, res) => {
  res.status(200).json({
    status: 'ok',
    audioCallCount: audioHandler.getCallCount()
  });
});

// Eleven Labs Voices API endpoint
app.get('/v1/voices', (req, res) => {
  res.status(200).json(MOCK_VOICES);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3002;
app.listen(PORT, () => {
  console.log(`Mock Eleven Labs TTS server is running on port ${PORT}`);
});