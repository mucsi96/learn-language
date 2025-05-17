import express from 'express';

const app = express();

app.use(express.json());

const messagesMatch = (
  messages: any[],
  systemPromptIncludes: string,
  userMessageIncludes: string
): boolean => {
  return (
    messages[0]?.content.includes(systemPromptIncludes) &&
    messages[1]?.content?.includes(userMessageIncludes)
  );
};

const imageMessagesMatch = (
  messages: any[],
  systemPromptIncludes: string,
  imageTextIncludes: string
): boolean => {
  return (
    messages[0]?.content.includes(systemPromptIncludes) &&
    messages[1]?.content[0]?.text?.includes(imageTextIncludes)
  );
};

const createAssistantResponse = (
  content: string | object,
  model: string = 'gpt-3.5-turbo',
  finishReason: string = 'stop'
) => {
  const messageContent =
    typeof content === 'object' ? JSON.stringify(content) : content;

  return {
    id: 'mock-id',
    object: 'chat.completion',
    created: Date.now(),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: messageContent,
        },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
    },
  };
};

// Middleware to log access details
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.post('/v1/chat/completions', (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: { message: 'Invalid request format' } });
    return;
  }

  if (
    imageMessagesMatch(
      messages,
      'You task is to extract the wordlist data from provided page image.',
      'Here is the image of the page'
    )
  ) {
    res.status(200).json(
      createAssistantResponse({
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
      })
    );
    return;
  }

  if (
    messagesMatch(
      messages,
      'Your task is to translate the given word and examples to English.',
      'abfahren'
    )
  ) {
    res.status(200).json(
      createAssistantResponse({
        translation: 'to depart, to leave',
        examples: ["We are departing at twelve o'clock."],
      })
    );
    return;
  }

  if (
    messagesMatch(
      messages,
      'Your task is to translate the given word and examples to Hungarian.',
      'abfahren'
    )
  ) {
    res.status(200).json(
      createAssistantResponse({
        translation: 'elindulni, elhagyni',
        examples: ['Tizenkét órakor indulunk.'],
      })
    );
    return;
  }

  if (
    messagesMatch(
      messages,
      'Your task is to translate the given word and examples to Swiss German.',
      'abfahren'
    )
  ) {
    res.status(200).json(
      createAssistantResponse({
        translation: 'abfahra, verlah',
        examples: ['Mir fahred am zwöufi ab.'],
      })
    );
    return;
  }

  if (
    messagesMatch(
      messages,
      'Your task is to determine the type of the given word',
      'abfahren'
    )
  ) {
    res.status(200).json(
      createAssistantResponse({
        word: 'abfahren',
        type: 'ige',
      })
    );
    return;
  }

  console.log('Received unprocessed messages:', messages);

  // Mock response for OpenAI Chat API
  res.json(
    createAssistantResponse('This is a mock response from the OpenAI Chat API.')
  );
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Mock OpenAI server is running on port ${PORT}`);
});
