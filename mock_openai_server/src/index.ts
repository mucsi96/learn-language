import express from 'express';

const app = express();
// Source: https://png-pixel.com
const yellow_image = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==';
const red_image = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC';
const blue_image = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC';
const green_image = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=';

let imageCallCounter1 = 0;
let imageCallCounter2 = 0;

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
  // Skip logging for health endpoint
  if (req.url !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Add route to reset state for tests
app.post('/reset', (req, res) => {
  imageCallCounter1 = 0;
  imageCallCounter2 = 0;
  console.log('Reset image counter to 0');
  res.status(200).json({ status: 'ok', message: 'Image counter reset to 0' });
});

// Add route for image generation mock
app.post('/images/generations', (req, res) => {
  const { prompt } = req.body;

  console.log('Received image generation request with prompt:', prompt, {
    imageCallCounter1,
    imageCallCounter2,
  });

  let b64_json = yellow_image;

  if (prompt.includes("We are departing at twelve o'clock.")) {
    imageCallCounter1++;
    b64_json = imageCallCounter1 > 1 ? blue_image : yellow_image;
  }

  if (prompt.includes('When does the train leave?')) {
    imageCallCounter2++;
    b64_json = imageCallCounter2 > 1 ? green_image : red_image;
  }

  res.status(200).json({
    created: Date.now(),
    data: [
      {
        b64_json,
        revised_prompt: prompt,
        url: null,
      },
    ],
  });
});

app.post('/chat/completions', (req, res) => {
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
            examples: ['Wir fahren um zwölf Uhr ab.', 'Wann fährt der Zug ab?'],
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
        examples: [
          "We are departing at twelve o'clock.",
          'When does the train leave?',
        ],
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
        examples: ['Tizenkét órakor indulunk.', 'Mikor indul a vonat?'],
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
        examples: ['Mir fahred am zwöufi ab.', 'Wänn fahrt de Zug ab?'],
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
