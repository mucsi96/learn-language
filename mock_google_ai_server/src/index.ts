import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';
import { ChatHandler } from './chatHandler';
import { GoogleBatchHandler } from './batchHandler';

const app = express();
const imageHandler = new ImageGenerationHandler();
const chatHandler = new ChatHandler();
const batchHandler = new GoogleBatchHandler(imageHandler);

app.use(express.json({ limit: '50mb' }));

// Middleware to log access details
app.use((req, res, next) => {
  if (req.url !== '/health' && req.url !== '/reset') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  next();
});

app.post('/reset', (req, res) => {
  imageHandler.reset();
  batchHandler.reset();
  res.status(200).json({ status: 'ok', message: 'State reset' });
});

app.post('/v1beta/models/imagen-4.0-ultra-generate-001:predict', (req, res) => {
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

// Batch API: Create batch job
app.post('/v1beta/batches', (req, res) => {
  try {
    const { model, src } = req.body;
    const inlinedRequests = src?.inlinedRequests ?? [];

    console.log(`Batch create request: model=${model}, requests=${inlinedRequests.length}`);

    const batch = batchHandler.createBatch(model, inlinedRequests);
    console.log(`Batch created: ${batch.name}`);

    res.status(200).json({
      name: batch.name,
      state: batch.state,
      dest: {
        inlinedResponses: batch.inlinedResponses,
      },
    });
  } catch (error: any) {
    console.error('Batch creation error:', error);
    res.status(500).json({ error: { message: error.message || 'Batch creation failed' } });
  }
});

// Batch API: Get batch job status
app.get('/v1beta/batches/:batchName(*)', (req, res) => {
  try {
    const batchName = `batches/${req.params.batchName}`;
    const batch = batchHandler.getBatch(batchName);
    if (!batch) {
      res.status(404).json({ error: { message: 'Batch not found' } });
      return;
    }
    res.status(200).json({
      name: batch.name,
      state: batch.state,
      dest: {
        inlinedResponses: batch.inlinedResponses,
      },
    });
  } catch (error: any) {
    console.error('Batch retrieval error:', error);
    res.status(500).json({ error: { message: error.message || 'Batch retrieval failed' } });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mock Google AI server is running on port ${PORT}`);
});
