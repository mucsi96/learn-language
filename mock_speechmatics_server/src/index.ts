import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(express.json());

app.post('/reset', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const TRANSCRIPT_WORDS = ['Hund', 'Katze'];

wss.on('connection', (socket: WebSocket) => {
  socket.on('message', (data: Buffer, isBinary: boolean) => {
    if (isBinary) {
      return;
    }

    let message: { message?: string };
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.message === 'StartRecognition') {
      socket.send(JSON.stringify({ message: 'RecognitionStarted', id: 'mock-session' }));
      TRANSCRIPT_WORDS.forEach((word) => {
        socket.send(
          JSON.stringify({
            message: 'AddTranscript',
            metadata: { transcript: `${word} ` },
            results: [
              { type: 'word', alternatives: [{ content: word, confidence: 0.98 }] },
            ],
          })
        );
      });
    } else if (message.message === 'EndOfStream') {
      socket.send(JSON.stringify({ message: 'EndOfTranscript' }));
    }
  });
});

const PORT = process.env.PORT ?? 3075;
server.listen(PORT, () => {
  console.log(`Mock Speechmatics server is running on port ${PORT}`);
});
