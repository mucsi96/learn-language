import express from 'express';
import multer from 'multer';
import { ImageGenerationHandler, IMAGES } from './imageGeneration';

const app = express();
const upload = multer();
const imageHandler = new ImageGenerationHandler();

app.use((req, res, next) => {
  if (req.url !== '/health' && req.url !== '/reset') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.post('/reset', (req, res) => {
  imageHandler.reset();
  res.status(200).json({ status: 'ok', message: 'Mock state reset' });
});

app.post('/v1/:model/generate', upload.none(), (req, res) => {
  try {
    const prompt: string = req.body.text_prompt ?? '';
    const renderingSpeed: string = req.body.rendering_speed ?? 'DEFAULT';
    console.log('Received image generation request', { prompt, renderingSpeed });

    const color = imageHandler.resolveColor(prompt);
    const url = `${req.protocol}://${req.get('host')}/images/${color}.png`;

    res.status(200).json({
      created: new Date().toISOString(),
      data: [
        {
          url,
          prompt,
          resolution: '1024x1024',
          is_image_safe: true,
          seed: 0,
          style_type: 'GENERAL',
        },
      ],
    });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: { message: 'Image generation failed' } });
  }
});

app.get('/images/:file', (req, res) => {
  const color = req.params.file.replace(/\.png$/, '');
  const base64 = IMAGES[color];
  if (!base64) {
    res.status(404).json({ error: { message: `Unknown image: ${color}` } });
    return;
  }
  res.status(200).type('image/png').send(Buffer.from(base64, 'base64'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3074;
app.listen(PORT, () => {
  console.log(`Mock Ideogram server is running on port ${PORT}`);
});
