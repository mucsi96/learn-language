import express from 'express';

const app = express();

app.use(express.json());

// Middleware to log access details
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.post('/v1/chat/completions', (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res
      .status(400)
      .json({ error: { message: 'Invalid request format' } });
      return;
  }

  console.log('Received messages:', messages);

  if (messages[1]?.content[0]?.text.includes('Here is the image of the page')) {
    res.status(200).json({
      id: 'mock-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              wordList: [
                {
                  word: 'aber',
                  forms: [],
                  examples: ['Ab morgen muss ich arbeiten.'],
                },
                {
                  word: 'abfahren',
                  forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
                  examples: ['Wir fahren um zwölf Uhr ab.'],
                },
              ],
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 10,
        total_tokens: 20,
      },
    });
    return;
  }

  // Mock response for OpenAI Chat API
  res.json({
    id: 'mock-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock response from the OpenAI Chat API.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Mock OpenAI server is running on port ${PORT}`);
});
