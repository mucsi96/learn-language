import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';
import { ChatHandler } from './chatHandler';

const app = express();
const imageHandler = new ImageGenerationHandler();
const chatHandler = new ChatHandler();

app.use(express.json());

app.use((req, res, next) => {
  if (req.url !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  next();
});

app.post('/reset', (req, res) => {
  imageHandler.reset();
  console.log('Reset image counter to 0');
  res.status(200).json({ status: 'ok', message: 'Image counter reset to 0' });
});

app.post('/v1beta/models/imagen-4.0-ultra:predict', (req, res) => {
  try {
    const prompt = req.body.instances[0].prompt;
    console.log({ prompt });
    const imageBytes = imageHandler.generateImage(prompt);
    res.status(200).json({
      predictions: [
        {
          mimeType: 'image/jpeg',
          bytesBase64Encoded: imageBytes,
        },
      ],
    });
    console.log({ imageBytes });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: { message: 'Image generation failed' } });
  }
});

app.post(
  '/v1beta/models/gemini-3-pro-image-preview:generateContent',
  (req, res) => {
    try {
      const prompt = req.body.contents[0].parts[0].text;
      console.log({ prompt });
      const imageBytes = imageHandler.generateImage(prompt);
      res.status(200).json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: imageBytes,
                  },
                },
              ],
            },
          },
        ],
      });
      console.log({ imageBytes });
    } catch (error) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: { message: 'Image generation failed' } });
    }
  }
);

app.post(/\/v1beta\/models\/([^/]+):generateContent/, async (req, res) => {
  try {
    const model = req.params[0];
    if (model === 'gemini-3-pro-image-preview') {
      return res.status(404).json({ error: { message: 'Use specific image endpoint' } });
    }
    console.log(`Gemini chat request for model: ${model}`);
    const result = await chatHandler.processRequest(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Chat completion error:', error);
    res.status(400).json({ error: { message: error.message || 'Invalid request format' } });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mock Google AI server is running on port ${PORT}`);
});
