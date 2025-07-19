import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';
import { AudioGenerationHandler } from './audioGeneration';
import { ChatHandler } from './chatHandler';

const app = express();
const imageHandler = new ImageGenerationHandler();
const audioHandler = new AudioGenerationHandler();
const chatHandler = new ChatHandler();

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
  imageHandler.reset();
  console.log('Reset image counter to 0');
  res.status(200).json({ status: 'ok', message: 'Image counter reset to 0' });
});

// Add route for image generation mock
app.post('/images/generations', (req, res) => {
  try {
    const result = imageHandler.generateImage(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: { message: 'Image generation failed' } });
  }
});

// Add route for audio generation mock
app.post('/audio/speech', (req, res) => {
  try {
    const result = audioHandler.generateAudio(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({ error: { message: 'Audio generation failed' } });
  }
});

app.post('/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body;
    const result = await chatHandler.processMessages(messages);
    res.status(200).json(result);
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(400).json({ error: { message: error.message || 'Invalid request format' } });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Mock OpenAI server is running on port ${PORT}`);
});
