import express from 'express';
import { ChatHandler } from './chatHandler';

const app = express();
const chatHandler = new ChatHandler();

app.use(express.json());

app.use((req, res, next) => {
  if (req.url !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.post('/reset', (req, res) => {
  console.log('Reset called');
  res.status(200).json({ status: 'ok', message: 'Reset complete' });
});

app.post('/v1/messages', (req, res) => {
  try {
    console.log('Claude messages request:', JSON.stringify(req.body, null, 2));
    const result = chatHandler.processRequest(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Chat completion error:', error);
    res.status(400).json({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: error.message || 'Invalid request format'
      }
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3003;
app.listen(PORT, () => {
  console.log(`Mock Anthropic server is running on port ${PORT}`);
});
