import { Client } from 'pg';
import { Page, Locator, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Storage directory path (matches docker-compose.yaml configuration)
export const STORAGE_DIR = path.join(__dirname, 'storage');

// Database connection helper
export async function withDbConnection<T>(callback: (client: Client) => Promise<T>): Promise<T> {
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
  startPage?: number;
  languageLevel: string;
  cardType: string;
  formatType: string;
  sourceType?: string;
  bookmarkedPage?: number | null;
}): Promise<void> {
  const {
    id,
    name,
    startPage,
    languageLevel,
    cardType,
    formatType,
    sourceType = 'PDF',
    bookmarkedPage = null,
  } = params;

  await withDbConnection(async (client) => {
    await client.query(
      `INSERT INTO learn_language.sources (id, name, start_page, language_level, card_type, format_type, source_type, bookmarked_page)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, startPage, languageLevel, cardType, formatType, sourceType, bookmarkedPage]
    );
  });
}

export async function createDocument(params: {
  sourceId: string;
  fileName: string;
  pageNumber?: number | null;
}): Promise<number> {
  const { sourceId, fileName, pageNumber = null } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.documents (source_id, file_name, page_number)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [sourceId, fileName, pageNumber]
    );
    return result.rows[0].id;
  });
}

export async function getDocuments(sourceId: string): Promise<
  Array<{
    id: number;
    fileName: string;
    pageNumber: number | null;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, file_name as "fileName", page_number as "pageNumber"
       FROM learn_language.documents
       WHERE source_id = $1
       ORDER BY page_number NULLS FIRST`,
      [sourceId]
    );
    return result.rows;
  });
}

export async function getSource(id: string): Promise<{
  id: string;
  name: string;
  startPage: number;
  languageLevel: string;
  cardType: string;
  formatType: string;
  sourceType: string | null;
  bookmarkedPage: number | null;
} | null> {
  return withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, name, start_page as "startPage",
              language_level as "languageLevel", card_type as "cardType",
              format_type as "formatType", source_type as "sourceType",
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
    await client.query('DELETE FROM learn_language.study_session_cards');
    await client.query('DELETE FROM learn_language.study_sessions');
    await client.query('DELETE FROM learn_language.review_logs');
    await client.query('DELETE FROM learn_language.cards');
    await client.query('DELETE FROM learn_language.model_usage_logs');
    await client.query('DELETE FROM learn_language.voice_configurations');
    await client.query('DELETE FROM learn_language.chat_model_settings');
    await client.query('DELETE FROM learn_language.known_words');
    await client.query('DELETE FROM learn_language.learning_partners');
    await client.query('DELETE FROM learn_language.documents');
    await client.query('DELETE FROM learn_language.sources');
  });

  if (!withSources) {
    // Create test sources and their PDF documents
    await createSource({
      id: 'goethe-a1',
      name: 'Goethe A1',
      startPage: 9,
      languageLevel: 'A1',
      cardType: 'VOCABULARY',
      formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
      bookmarkedPage: 9,
    });
    await createDocument({
      sourceId: 'goethe-a1',
      fileName: 'A1_SD1_Wortliste_02.pdf',
    });

    await createSource({
      id: 'goethe-a2',
      name: 'Goethe A2',
      startPage: 8,
      languageLevel: 'A2',
      cardType: 'VOCABULARY',
      formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
      bookmarkedPage: 8,
    });
    await createDocument({
      sourceId: 'goethe-a2',
      fileName: 'Goethe-Zertifikat_A2_Wortliste.pdf',
    });

    await createSource({
      id: 'goethe-b1',
      name: 'Goethe B1',
      startPage: 16,
      languageLevel: 'B1',
      cardType: 'VOCABULARY',
      formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
      bookmarkedPage: null,
    });
    await createDocument({
      sourceId: 'goethe-b1',
      fileName: 'Goethe-Zertifikat_B1_Wortliste.pdf',
    });
    await createSource({
      id: 'speech-a1',
      name: 'Speech A1',
      startPage: 1,
      languageLevel: 'A1',
      cardType: 'SPEECH',
      formatType: 'FLOWING_TEXT',
      sourceType: 'IMAGES',
    });

    await createSource({
      id: 'grammar-a1',
      name: 'Grammar A1',
      startPage: 1,
      languageLevel: 'A1',
      cardType: 'GRAMMAR',
      formatType: 'FLOWING_TEXT',
      sourceType: 'IMAGES',
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
  word?: string;
  type?: string;
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
        Object.entries(baseTranslations).map(([code, trans]) => [code, `${trans}_${word}`])
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

export const menschenA1Image = fs.readFileSync(path.join(__dirname, 'menshcen-a1-1-9.png'));
export const menschenA1GrammarImage = fs.readFileSync(path.join(__dirname, 'menshcen-a1-1-11.png'));

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
    const base64Data = await imageElement.evaluate(async (el: HTMLImageElement) => {
      const response = await fetch(el.src);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    });
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

export async function selectRegion(page: Page, startText: string, endText: string): Promise<void> {
  const startElement = page.getByText(startText, { exact: true });
  const endElement = page.getByText(endText, { exact: true });

  await expect(startElement).toBeVisible();
  await expect(endElement).toBeVisible();

  await page.waitForLoadState('networkidle');

  const startBox = await startElement.boundingBox();
  const endBox = await endElement.boundingBox();

  if (!startBox || !endBox) {
    throw new Error('Could not get bounding boxes for text selection');
  }

  await page.mouse.move(startBox.x - 5, startBox.y - 5);
  await page.mouse.down();
  await page.mouse.move(endBox.x + endBox.width + 5, endBox.y + endBox.height + 5);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

export async function selectTextRange(page: Page, startText: string, endText: string): Promise<void> {
  await selectRegion(page, startText, endText);
  await page.getByRole('button', { name: 'Confirm selection' }).click();
}

export async function scrollElementToTop(page: Page, selectorText: string, exact: boolean = true): Promise<void> {
  const element = page.getByText(selectorText, { exact });
  await expect(element).toBeVisible();
  await element.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForLoadState('networkidle');
}

export async function navigateToCardEditing(
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
  return new Date(
    Date.UTC(
      dt.getFullYear(),
      dt.getMonth(),
      dt.getDate(),
      dt.getHours(),
      dt.getMinutes(),
      dt.getSeconds(),
      dt.getMilliseconds()
    )
  );
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

export async function getModelUsageLogs(): Promise<
  Array<{
    id: number;
    modelName: string;
    modelType: string;
    operationType: string;
    inputTokens: number | null;
    outputTokens: number | null;
    rating: number | null;
  }>
> {
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

export async function createVoiceConfiguration(params: {
  voiceId: string;
  model: string;
  language: string;
  displayName?: string | null;
  isEnabled?: boolean;
}): Promise<number> {
  const { voiceId, model, language, displayName = null, isEnabled = true } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.voice_configurations (voice_id, model, language, display_name, is_enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [voiceId, model, language, displayName, isEnabled]
    );
    return result.rows[0].id;
  });
}

export async function getVoiceConfigurations(): Promise<
  Array<{
    id: number;
    voiceId: string;
    model: string;
    language: string;
    displayName: string | null;
    isEnabled: boolean;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, voice_id as "voiceId", model, language,
              display_name as "displayName", is_enabled as "isEnabled"
       FROM learn_language.voice_configurations
       ORDER BY id`
    );
    return result.rows;
  });
}

export async function createChatModelSetting(params: {
  modelName: string;
  operationType: string;
  isEnabled?: boolean;
  isPrimary?: boolean;
}): Promise<number> {
  const { modelName, operationType, isEnabled = true, isPrimary = false } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.chat_model_settings (model_name, operation_type, is_enabled, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [modelName, operationType, isEnabled, isPrimary]
    );
    return result.rows[0].id;
  });
}

const ALL_OPERATION_TYPES = [
  'TRANSLATION',
  'EXTRACTION',
  'CLASSIFICATION',
];

const DEFAULT_CHAT_MODEL = 'gemini-3-pro-preview';

export async function setupDefaultChatModelSettings(): Promise<void> {
  for (const operationType of ALL_OPERATION_TYPES) {
    await createChatModelSetting({
      modelName: DEFAULT_CHAT_MODEL,
      operationType,
      isEnabled: true,
      isPrimary: true,
    });
  }
}

export async function clearChatModelSettings(): Promise<void> {
  await withDbConnection(async (client) => {
    await client.query('DELETE FROM learn_language.chat_model_settings');
  });
}

export async function getChatModelSettings(): Promise<
  Array<{
    id: number;
    modelName: string;
    operationType: string;
    isEnabled: boolean;
    isPrimary: boolean;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, model_name as "modelName", operation_type as "operationType",
              is_enabled as "isEnabled", is_primary as "isPrimary"
       FROM learn_language.chat_model_settings
       ORDER BY id`
    );
    return result.rows;
  });
}

export async function getTableData<T extends Record<string, string>>(
  table: Locator,
  options: { excludeRowSelector?: string } = {}
): Promise<T[]> {
  const { excludeRowSelector } = options;

  await expect(table).toBeVisible();

  return (await table.evaluate((tableEl, excludeSelector) => {
    function getTextContent(element: Element): string {
      let text = '';
      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.getAttribute('role') !== 'img') {
            text += getTextContent(el);
          }
        }
      }
      return text.trim().replace(/\s+/g, ' ');
    }

    const headers = Array.from(tableEl.querySelectorAll('thead th')).map((th) => getTextContent(th));

    const rowSelector = excludeSelector ? `tbody tr:not(${excludeSelector})` : 'tbody tr';
    const rows = Array.from(tableEl.querySelectorAll(rowSelector));

    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData: Record<string, string> = {};

      headers.forEach((header, index) => {
        if (header) {
          rowData[header] = cells[index] ? getTextContent(cells[index]) : '';
        }
      });

      return rowData;
    });
  }, excludeRowSelector)) as T[];
}

export interface KnownWordInput {
  word: string;
  hungarianTranslation?: string | null;
}

export async function createKnownWord(word: string, hungarianTranslation?: string | null): Promise<number> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.known_words (word, hungarian_translation)
       VALUES ($1, $2)
       RETURNING id`,
      [word.toLowerCase().trim(), hungarianTranslation || null]
    );
    return result.rows[0].id;
  });
}

export async function createKnownWords(words: KnownWordInput[]): Promise<void> {
  await withDbConnection(async (client) => {
    for (const item of words) {
      await client.query(
        `INSERT INTO learn_language.known_words (word, hungarian_translation)
         VALUES ($1, $2)
         ON CONFLICT (word) DO NOTHING`,
        [item.word.toLowerCase().trim(), item.hungarianTranslation || null]
      );
    }
  });
}

export async function getKnownWords(): Promise<Array<{ word: string; hungarianTranslation: string | null }>> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT word, hungarian_translation as "hungarianTranslation"
       FROM learn_language.known_words ORDER BY word`
    );
    return result.rows;
  });
}

export async function clearKnownWords(): Promise<void> {
  await withDbConnection(async (client) => {
    await client.query('DELETE FROM learn_language.known_words');
  });
}

export async function createLearningPartner(params: { name: string; isActive?: boolean }): Promise<number> {
  const { name, isActive = false } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.learning_partners (name, is_active)
       VALUES ($1, $2)
       RETURNING id`,
      [name, isActive]
    );
    return result.rows[0].id;
  });
}

export async function getLearningPartners(): Promise<
  Array<{
    id: number;
    name: string;
    isActive: boolean;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, name, is_active as "isActive"
       FROM learn_language.learning_partners
       ORDER BY id`
    );
    return result.rows;
  });
}

export async function getReviewLogs(): Promise<
  Array<{
    id: number;
    cardId: string;
    learningPartnerId: number | null;
    rating: number;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, card_id as "cardId", learning_partner_id as "learningPartnerId", rating
       FROM learn_language.review_logs
       ORDER BY id`
    );
    return result.rows;
  });
}

export async function getReviewLogsByCardId(cardId: string): Promise<
  Array<{
    cardId: string;
    rating: number;
    state: string;
    stability: number;
    difficulty: number;
    learningPartnerId: number | null;
  }>
> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT card_id as "cardId", rating, state,
              stability::float as stability, difficulty::float as difficulty,
              learning_partner_id as "learningPartnerId"
       FROM learn_language.review_logs
       WHERE card_id = $1
       ORDER BY id`,
      [cardId]
    );
    return result.rows;
  });
}

export async function getCardFromDb(cardId: string): Promise<{
  state: string;
  reps: number;
  stability: number;
  difficulty: number;
  readiness: string;
}> {
  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT state, reps, stability::float as stability,
              difficulty::float as difficulty, readiness
       FROM learn_language.cards
       WHERE id = $1`,
      [cardId]
    );
    return result.rows[0];
  });
}

export async function createReviewLog(params: {
  cardId: string;
  learningPartnerId?: number | null;
  rating: number;
  review?: Date;
  state?: string;
  stability?: number;
  difficulty?: number;
  elapsedDays?: number;
  scheduledDays?: number;
  learningSteps?: number | null;
  due?: Date;
}): Promise<number> {
  const {
    cardId,
    learningPartnerId = null,
    rating,
    review = new Date(),
    state = 'LEARNING',
    stability = 1.0,
    difficulty = 5.0,
    elapsedDays = 0,
    scheduledDays = 1,
    learningSteps = null,
    due = new Date(),
  } = params;

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `INSERT INTO learn_language.review_logs (
        card_id, learning_partner_id, rating, review, state, stability,
        difficulty, elapsed_days, scheduled_days, learning_steps, due
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        cardId,
        learningPartnerId,
        rating,
        review,
        state,
        stability,
        difficulty,
        elapsedDays,
        scheduledDays,
        learningSteps,
        due,
      ]
    );
    return result.rows[0].id;
  });
}

export async function getStudySessionCards(page: Page): Promise<
  Array<{
    cardId: string;
    position: number;
    learningPartnerId: number | null;
  }>
> {
  await page.getByRole('article', { name: 'Flashcard' }).waitFor();
  const sourceId = page.url().match(/sources\/([^/]+)\/study/)?.[1];

  return await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT c.id as "cardId", ssc.position, ssc.learning_partner_id as "learningPartnerId"
       FROM learn_language.study_session_cards ssc
       JOIN learn_language.cards c ON ssc.card_id = c.id
       JOIN learn_language.study_sessions ss ON ssc.session_id = ss.id
       WHERE ss.source_id = $1
         AND ss.created_at >= CURRENT_DATE
       ORDER BY ssc.position`,
      [sourceId]
    );
    return result.rows;
  });
}
