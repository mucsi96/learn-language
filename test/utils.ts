import { Client } from 'pg';
import { Page, Locator, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Storage directory path (matches docker-compose.yaml configuration)
export const STORAGE_DIR = path.join(__dirname, 'storage');

// Database connection helper
export async function withDbConnection<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({
    host: 'localhost',
    port: 5460,
    database: 'test',
    user: 'postgres',
    password: 'postgres',
  });

  await client.connect();
  try {
    const result = await callback(client);
    return result;
  } finally {
    await client.end();
  }
}

export async function cleanupDb(): Promise<void> {
  await withDbConnection(async (client) => {
    await client.query('DROP SCHEMA IF EXISTS learn_language CASCADE');
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for a short moment to ensure cleanup
  });
}

export async function createSource(params: {
  id: string;
  name: string;
  fileName: string;
  startPage: number;
  languageLevel: string;
  cardType: string;
  bookmarkedPage?: number | null;
}): Promise<void> {
  const {
    id,
    name,
    fileName,
    startPage,
    languageLevel,
    cardType,
    bookmarkedPage = null,
  } = params;

  await withDbConnection(async (client) => {
    await client.query(
      `INSERT INTO learn_language.sources (id, name, file_name, start_page, language_level, card_type, bookmarked_page)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, fileName, startPage, languageLevel, cardType, bookmarkedPage]
    );
  });
}

export async function getSource(id: string): Promise<{
  id: string;
  name: string;
  fileName: string;
  startPage: number;
  languageLevel: string;
  cardType: string;
  bookmarkedPage: number | null;
} | null> {
  return withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, name, file_name as "fileName", start_page as "startPage",
              language_level as "languageLevel", card_type as "cardType",
              bookmarked_page as "bookmarkedPage"
       FROM learn_language.sources
       WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

export async function cleanupDbRecords({ withSources }: { withSources?: boolean } = {}): Promise<void> {
  await withDbConnection(async (client) => {
    // Delete records in order to respect foreign key constraints
    await client.query('DELETE FROM learn_language.review_logs');
    await client.query('DELETE FROM learn_language.cards');
    await client.query('DELETE FROM learn_language.model_usage_logs');

    // Reset sequences
    await client.query(
      "SELECT setval('learn_language.review_logs_id_seq', 1, false)"
    );
    await client.query(
      "SELECT setval('learn_language.model_usage_logs_id_seq', 1, false)"
    );

    // Delete all sources
    await client.query('DELETE FROM learn_language.sources');
  });

  if (!withSources) {
    // Create test sources
    await createSource({
      id: 'goethe-a1',
      name: 'Goethe A1',
      fileName: 'A1_SD1_Wortliste_02.pdf',
      startPage: 9,
      languageLevel: 'A1',
      cardType: 'VOCABULARY',
      bookmarkedPage: 9,
    });

    await createSource({
      id: 'goethe-a2',
      name: 'Goethe A2',
      fileName: 'Goethe-Zertifikat_A2_Wortliste.pdf',
      startPage: 8,
      languageLevel: 'A2',
      cardType: 'VOCABULARY',
      bookmarkedPage: 8,
    });

    await createSource({
      id: 'goethe-b1',
      name: 'Goethe B1',
      fileName: 'Goethe-Zertifikat_B1_Wortliste.pdf',
      startPage: 16,
      languageLevel: 'B1',
      cardType: 'VOCABULARY',
      bookmarkedPage: null,
    });
  }
}

export async function populateDb(): Promise<void> {
  await withDbConnection(async (client) => {
    const initSqlPath = path.join(__dirname, '..', 'server', 'src', 'main', 'resources', 'schema.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf-8');
    await client.query(initSql);
  });
}

export function cleanupStorage(): void {
  const imagesDir = path.join(STORAGE_DIR, 'images');
  const audioDir = path.join(STORAGE_DIR, 'audio');

  if (fs.existsSync(imagesDir)) {
    fs.rmSync(imagesDir, { recursive: true, force: true });
  }
  if (fs.existsSync(audioDir)) {
    fs.rmSync(audioDir, { recursive: true, force: true });
  }
}

export function populateStorage(): void {
  const sourcesDir = path.join(STORAGE_DIR, 'sources');
  fs.mkdirSync(sourcesDir, { recursive: true });

  const pdfFiles = [
    'A1_SD1_Wortliste_02.pdf',
    'Goethe-Zertifikat_A2_Wortliste.pdf',
    'Goethe-Zertifikat_B1_Wortliste.pdf',
  ];

  const testDir = path.join(__dirname, '..', 'test');

  // Copy PDF files to sources directory
  // This ensures the files are always present, even if they already exist
  for (const filename of pdfFiles) {
    const sourcePath = path.join(testDir, filename);
    const destPath = path.join(sourcesDir, filename);

    // Only copy if source file doesn't exist in destination
    // This prevents unnecessary file operations while ensuring files are always available
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

interface CardData {
  word: string;
  type: string;
  translation?: Record<string, string>;
  forms?: any[];
  examples?: any[];
  [key: string]: any;
}

export async function createCard(params: {
  cardId: string;
  sourceId: string;
  data: CardData;
  state?: string;
  learningSteps?: number;
  due?: Date;
  stability?: number;
  difficulty?: number;
  sourcePageNumber?: number;
  lastReview?: Date | null;
  elapsedDays?: number;
  scheduledDays?: number;
  reps?: number;
  lapses?: number;
  readiness?: string;
}): Promise<void> {
  const {
    cardId,
    sourceId,
    data,
    state = 'NEW',
    learningSteps = 0,
    due = new Date(Date.now() - 86400000), // 1 day ago
    stability = 0.0,
    difficulty = 0.0,
    sourcePageNumber = 1,
    lastReview = null,
    elapsedDays = 0,
    scheduledDays = 0,
    reps = 0,
    lapses = 0,
    readiness = 'READY',
  } = params;

  await withDbConnection(async (client) => {
    await client.query(
      `INSERT INTO learn_language.cards (
        id, source_id, source_page_number, data, state, learning_steps,
        stability, difficulty, due, last_review, elapsed_days, scheduled_days,
        reps, lapses, readiness
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )`,
      [
        cardId,
        sourceId,
        sourcePageNumber,
        JSON.stringify(data),
        state,
        learningSteps,
        stability,
        difficulty,
        due,
        lastReview,
        elapsedDays,
        scheduledDays,
        reps,
        lapses,
        readiness,
      ]
    );
  });
}

interface CardSpec {
  state: string;
  count: number;
  due_date: Date;
}

export async function createCardsWithStates(
  sourceId: string,
  cardsToCreate: CardSpec[],
  baseTranslations: Record<string, string> = {
    en: 'test',
    hu: 'teszt',
    ch: 'test',
  }
): Promise<void> {
  function getWordData(state: string, index: number): CardData {
    const stateName = state.toLowerCase();
    const word = `${stateName}_${index}`;
    return {
      word,
      type: 'NOUN',
      translation: Object.fromEntries(
        Object.entries(baseTranslations).map(([code, trans]) => [
          code,
          `${trans}_${word}`,
        ])
      ),
      forms: [],
      examples: [],
    };
  }

  for (const cardSpec of cardsToCreate) {
    const { state, count, due_date } = cardSpec;

    for (let i = 0; i < count; i++) {
      const cardId = `${sourceId}_${state.toLowerCase()}_${i}`;

      await createCard({
        cardId,
        sourceId,
        data: getWordData(state, i),
        state,
        learningSteps: ['LEARNING', 'RELEARNING'].includes(state) ? 1 : 0,
        due: due_date,
      });
    }
  }
}

// Base64 encoded test images
export const yellowImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==',
  'base64'
);

export const redImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC',
  'base64'
);

export const blueImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC',
  'base64'
);

export const greenImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=',
  'base64'
);

export const germanAudioSample = Buffer.from(
  'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBC+Ezm4=',
  'base64'
);

export const hungarianAudioSample = Buffer.from(
  'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBCmEzmo=',
  'base64'
);

export async function getImageContent(imageElement: Locator): Promise<Buffer> {
  await expect(imageElement).toBeVisible();
  await expect(imageElement).toHaveJSProperty('complete', true);
  await expect(imageElement).toHaveAttribute('src', /blob:/);

  const imageSrc = await imageElement.getAttribute('src');

  if (!imageSrc) {
    throw new Error('Image src attribute is null');
  }

  if (imageSrc.startsWith('blob:')) {
    // Use browser context to fetch blob and return as base64
    const base64Data = await imageElement.evaluate(
      async (el: HTMLImageElement) => {
        const response = await fetch(el.src);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }
    );
    return Buffer.from(base64Data, 'base64');
  } else {
    const response = await fetch(imageSrc);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export function getColorImageBytes(color: string, size: number = 600): Buffer {
  const imagesDir = path.join(__dirname, '..', 'test', 'images');
  const filename = `${color}${size}.jpg`;
  return fs.readFileSync(path.join(imagesDir, filename));
}

export async function selectTextRange(
  page: Page,
  startText: string,
  endText: string
): Promise<void> {
  const startElement = page.getByText(startText, { exact: true });
  const endElement = page.getByText(endText, { exact: true });

  const startBox = await startElement.boundingBox();
  const endBox = await endElement.boundingBox();

  if (!startBox || !endBox) {
    throw new Error('Could not get bounding boxes for text selection');
  }

  await page.mouse.move(startBox.x - 5, startBox.y - 5);
  await page.mouse.down();
  await page.mouse.move(
    endBox.x + endBox.width + 5,
    endBox.y + endBox.height + 5
  );
  await page.mouse.up();
}

export async function scrollElementToTop(
  page: Page,
  selectorText: string,
  exact: boolean = true
): Promise<void> {
  const element = page.getByText(selectorText, { exact });
  await element.evaluate((el) =>
    el.scrollIntoView({ block: 'start', behavior: 'instant' })
  );
}

export async function navigateToCardCreation(
  page: Page,
  sourceName: string = 'Goethe A1',
  startText: string = 'aber',
  endText: string = 'Vor der Abfahrt rufe ich an.',
  wordName: string = 'abfahren'
): Promise<void> {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: sourceName }).click();
  await selectTextRange(page, startText, endText);
  await page.getByRole('link', { name: wordName }).click();
}

export function downloadImage(id: string): Buffer {
  const imagePath = path.join(STORAGE_DIR, 'images', `${id}.jpg`);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image ${id}.jpg does not exist in storage.`);
  }

  return fs.readFileSync(imagePath);
}

export function downloadAudio(id: string): Buffer {
  const audioPath = path.join(STORAGE_DIR, 'audio', `${id}.mp3`);

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio ${id}.mp3 does not exist in storage.`);
  }

  return fs.readFileSync(audioPath);
}

export function uploadMockImage(imageData: Buffer): string {
  const imagesDir = path.join(STORAGE_DIR, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const uuidStr = uuidv4();
  const imagePath = path.join(imagesDir, `${uuidStr}.jpg`);

  fs.writeFileSync(imagePath, imageData);

  return uuidStr;
}

export function ensureTimezoneAware(dt: Date): Date {
  // PostgreSQL stores dates as timestamp (without timezone)
  // The pg library interprets these as local time, but they are actually stored in UTC
  // We need to create a new Date treating the components as UTC
  return new Date(Date.UTC(
    dt.getFullYear(),
    dt.getMonth(),
    dt.getDate(),
    dt.getHours(),
    dt.getMinutes(),
    dt.getSeconds(),
    dt.getMilliseconds()
  ));
}

export async function createModelUsageLog(params: {
  modelName: string;
  modelType: 'CHAT' | 'IMAGE' | 'AUDIO';
  operationType: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  inputCharacters?: number | null;
  imageCount?: number | null;
  costUsd: number;
  processingTimeMs: number;
  responseContent?: string | null;
  rating?: number | null;
}): Promise<number> {
  const {
    modelName,
    modelType,
    operationType,
    inputTokens = null,
    outputTokens = null,
    inputCharacters = null,
    imageCount = null,
    costUsd,
    processingTimeMs,
    responseContent = null,
    rating = null,
  } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.model_usage_logs (
        model_name, model_type, operation_type, input_tokens, output_tokens,
        input_characters, image_count, cost_usd, processing_time_ms,
        response_content, rating, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id`,
      [
        modelName,
        modelType,
        operationType,
        inputTokens,
        outputTokens,
        inputCharacters,
        imageCount,
        costUsd,
        processingTimeMs,
        responseContent,
        rating,
      ]
    );
    return result.rows[0].id;
  });
}

export async function getModelUsageLogs(): Promise<Array<{
  id: number;
  modelName: string;
  modelType: string;
  operationType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  rating: number | null;
}>> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, model_name as "modelName", model_type as "modelType",
              operation_type as "operationType", input_tokens as "inputTokens",
              output_tokens as "outputTokens", rating
       FROM learn_language.model_usage_logs
       ORDER BY created_at DESC`
    );
    return result.rows;
  });
}
