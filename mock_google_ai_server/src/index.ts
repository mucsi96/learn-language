import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';

const app = express();
const imageHandler = new ImageGenerationHandler();

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

// Google AI Imagen API endpoint - mock response
app.post('/v1beta/models/imagen-4.0-ultra-generate-001:predict', (req, res) => {
  try {
    const prompt = req.body.instances[0].prompt;
    console.log({prompt});
    const result = imageHandler.generateImage(prompt);
    res.status(200).json(result);
    console.log({result});
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: { message: 'Image generation failed' } });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mock Google AI server is running on port ${PORT}`);
});
