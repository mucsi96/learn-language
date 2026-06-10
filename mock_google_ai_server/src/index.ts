import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';
import { ChatHandler } from './chatHandler';
import { AudioGenerationHandler } from './audioGeneration';

const app = express();
const imageHandler = new ImageGenerationHandler();
const chatHandler = new ChatHandler();
const audioHandler = new AudioGenerationHandler();

app.use(express.json({ limit: '25mb' }));

// Middleware to log access details
app.use((req, res, next) => {
  if (req.url !== '/health' && req.url !== '/reset') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  next();
});

app.post('/reset', (req, res) => {
  imageHandler.reset();
  chatHandler.reset();
  audioHandler.reset();
  res.status(200).json({ status: 'ok', message: 'Image counter reset to 0' });
});

app.get('/stats', (req, res) => {
  res.status(200).json({ audioCallCount: audioHandler.getCallCount() });
});

app.post('/configure', (req, res) => {
  const { failHungarianTranslation } = req.body;
  if (failHungarianTranslation !== undefined) {
    chatHandler.setFailHungarianTranslation(failHungarianTranslation);
  }
  res.status(200).json({ status: 'ok' });
});

app.post(
  '/v1beta/models/gemini-3-pro-image-preview:generateContent',
  (req, res) => {
    try {
      const prompt = req.body.contents[0].parts[0].text;
      console.log({ prompt });
      const images = imageHandler.generateImages(prompt);
      res.status(200).json({
        candidates: images.map(imageBytes => ({
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
        })),
      });
      console.log({ imageCount: images.length });
    } catch (error) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: { message: 'Image generation failed' } });
    }
  }
);

app.post(
  '/v1beta/models/gemini-3.1-flash-tts-preview:generateContent',
  (req, res) => {
    try {
      const prompt = req.body.contents[0].parts[0].text;
      const voiceName =
        req.body.generationConfig?.speechConfig?.voiceConfig
          ?.prebuiltVoiceConfig?.voiceName;
      const audio = audioHandler.generateAudio(prompt, voiceName);
      res.status(200).json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/L16;codec=pcm;rate=24000',
                    data: audio,
                  },
                },
              ],
            },
          },
        ],
      });
    } catch (error) {
      console.error('Audio generation error:', error);
      res.status(500).json({ error: { message: 'Audio generation failed' } });
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

const PORT = process.env.PORT ?? 3071;
app.listen(PORT, () => {
  console.log(`Mock Google AI server is running on port ${PORT}`);
});
