import express from 'express';
import { ImageGenerationHandler } from './imageGeneration';
import { AudioGenerationHandler } from './audioGeneration';
import { ChatHandler } from './chatHandler';
import { BatchHandler } from './batchHandler';

const app = express();
const imageHandler = new ImageGenerationHandler();
const audioHandler = new AudioGenerationHandler();
const chatHandler = new ChatHandler();
const batchHandler = new BatchHandler(imageHandler);

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

app.post('/images/generations', (req, res) => {
  try {
    const result = imageHandler.generateImage(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: { message: 'Image generation failed' } });
  }
});

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

app.post('/files', express.raw({ type: '*/*', limit: '200mb' }), (req, res) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : req.body.toString('utf-8');

    let jsonlContent = rawBody;
    const contentType = req.headers['content-type'] ?? '';
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = rawBody.split(`--${boundary}`);
      for (const part of parts) {
        if (part.includes('name="file"') || part.includes('.jsonl')) {
          const bodyStart = part.indexOf('\r\n\r\n');
          if (bodyStart !== -1) {
            jsonlContent = part.substring(bodyStart + 4).replace(/\r\n$/, '').trim();
            break;
          }
        }
      }
    }

    const file = batchHandler.uploadFile(jsonlContent, 'batch');
    console.log(`File uploaded: ${file.id}`);
    res.status(200).json({
      id: file.id,
      object: 'file',
      purpose: 'batch',
      filename: 'batch_input.jsonl',
      bytes: jsonlContent.length,
      created_at: Math.floor(Date.now() / 1000),
      status: 'processed',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: { message: error.message || 'File upload failed' } });
  }
});

app.post('/batches', (req, res) => {
  try {
    const { input_file_id } = req.body;
    const batch = batchHandler.createBatch(input_file_id);
    console.log(`Batch created: ${batch.id}`);
    res.status(200).json({
      id: batch.id,
      object: 'batch',
      endpoint: '/v1/responses',
      input_file_id: batch.inputFileId,
      completion_window: '24h',
      status: batch.status,
      output_file_id: batch.outputFileId,
      created_at: Math.floor(Date.now() / 1000),
      completed_at: Math.floor(Date.now() / 1000),
    });
  } catch (error: any) {
    console.error('Batch creation error:', error);
    res.status(500).json({ error: { message: error.message || 'Batch creation failed' } });
  }
});

app.get('/batches/:batchId', (req, res) => {
  try {
    const batch = batchHandler.getBatch(req.params.batchId);
    if (!batch) {
      res.status(404).json({ error: { message: 'Batch not found' } });
      return;
    }
    res.status(200).json({
      id: batch.id,
      object: 'batch',
      endpoint: '/v1/responses',
      input_file_id: batch.inputFileId,
      completion_window: '24h',
      status: batch.status,
      output_file_id: batch.outputFileId,
      created_at: Math.floor(Date.now() / 1000),
      completed_at: batch.status === 'completed' ? Math.floor(Date.now() / 1000) : null,
    });
  } catch (error: any) {
    console.error('Batch retrieval error:', error);
    res.status(500).json({ error: { message: error.message || 'Batch retrieval failed' } });
  }
});

app.get('/files/:fileId/content', (req, res) => {
  try {
    const content = batchHandler.getFileContent(req.params.fileId);
    if (!content) {
      res.status(404).json({ error: { message: 'File not found' } });
      return;
    }
    res.setHeader('Content-Type', 'application/jsonl');
    res.status(200).send(content);
  } catch (error: any) {
    console.error('File content error:', error);
    res.status(500).json({ error: { message: error.message || 'File content retrieval failed' } });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Mock OpenAI server is running on port ${PORT}`);
});
