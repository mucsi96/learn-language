# AGENTS.md

!IMPORTANT: Avoid using comments which are trivial or obvious. If comment is needed means the code is not clear enough.

## Java Code style
- Prefer using lombok
- Prefer using builder for models
- Prefer constructor injection with lombok

## Testing Code style
- Prefer using Playwright for end-to-end tests with Python in test folder
- exact=True should be used for exact text matching in Playwright tests
- Don't use assertion messages

## Angular Code style
- Prefer functional code over procedural
- Prefer using Angular Material components
- Prefer using Angular signal / resource for state management
- Prefer putting styles and templates to separate files
- Use angular resources core method when necessary
- Do  not use ::ng-deep
- Avoid using enum in TS. Prefer using string literals
- Always using new Angular templates
- Using rxjs is not allowed

## Project Overview

This is a language learning application that uses spaced repetition to help users learn languages through digital flashcards created from PDF documents. The app combines traditional spaced repetition with AI-powered features for translations, audio generation, and contextual examples.

## Architecture

**Backend**: Spring Boot 3.5.3 with Java 21, PostgreSQL database, Azure cloud services, OpenAI API integration, Google Gemini API integration, ElevenLabs Voices integration
**Frontend**: Angular 20 with Material UI, Azure MSAL authentication, TypeScript

### Key Technologies
- **Spaced Repetition**: Uses FSRS (Free Spaced Repetition Scheduler) algorithm via ts-fsrs library
- **AI Integration**: OpenAI GPT-4.1 for translations, ElevenLabs Voices for audio, Google Gemini API for example images  
- **Cloud Services**: Azure Blob Storage for PDFs/assets, Azure AD for authentication
- **PDF Processing**: Apache PDFBox for text extraction and document processing

## Development Commands

### Frontend (Angular)
```bash
cd client/
npm run start       # Development server
npm run build       # Production build
npm run watch       # Development build with watch mode
```

### Backend (Spring Boot)
```bash
cd server/
./mvnw spring-boot:run              # Run development server
./mvnw test                         # Run tests
./mvnw clean compile               # Clean and compile
```

### Testing
```bash
# Run end-to-end tests (Playwright)
pytest test/

# Run specific test file
pytest test/test_bulk_card_creation.py
```

### Docker Development
```bash
docker-compose up           # Start all services
docker-compose up -d        # Start in background
```

## Core Entities

### Card
Primary entity representing flashcards with JSONB data containing:
- Word information (translation, gender, word type, examples)
- FSRS scheduling data (stability, difficulty, due date, state)
- Multilingual content (German base + English, Swiss German, Hungarian)
- Audio references and example images

### Source  
Represents PDF documents with metadata (name, fileName, startPage, bookmarkedPage)

### ReviewLog
Tracks review history and performance metrics for spaced repetition

## Key Services

### Backend Services
- **CardService**: Core flashcard CRUD operations, spaced repetition scheduling, statistics
- **TranslationService**: OpenAI-powered multilingual translations with context awareness
- **AudioService**: TTS audio generation and management  
- **DocumentProcessorService**: PDF text extraction and processing
- **BlobStorageService**: Azure Storage integration for PDFs and assets

### Frontend Services
- **CardService**: Angular service for card state management and API interactions
- **SourcesService**: PDF source management and page navigation
- **BatchAudioCreationService**: Bulk audio generation with progress tracking
- **BulkCardCreationService**: Batch card creation workflows

## API Routes

### Key Endpoints
- `GET /api/sources` - List PDF sources
- `GET /api/sources/{id}/pages/{pageNumber}` - Process PDF page content
- `GET/POST/PUT/DELETE /api/cards` - Card CRUD operations
- `POST /api/translations` - AI-powered translations
- `POST /api/audio` - Generate pronunciation audio
- `GET /api/cards/due` - Spaced repetition due cards query

### Frontend Routes
- `/` - Home dashboard with study overview
- `/sources` - Admin panel for managing PDF sources
- `/sources/:sourceId/page/:pageNumber` - PDF page viewer with word selection
- `/sources/:sourceId/study` - Flashcard study mode
- `/in-review-cards` - Cards pending review

## Development Patterns

### Data Storage
- Uses JSONB for flexible card data structure in PostgreSQL
- Resource-based reactive patterns in Angular for efficient data loading
- Batch operations for bulk card and audio creation

### Authentication
- Azure Active Directory integration with role-based access control
- Scopes: `readDecks`, `createDeck`
- Roles: `DeckReader`, `DeckCreator`

### AI Integration
- Context-aware translations between German, English, Swiss German, Hungarian
- Intelligent audio pronunciation generation
- Contextual example image generation

## Testing Strategy

The test suite uses Playwright for end-to-end testing covering:
- Bulk card/audio creation workflows
- Card editing and review functionality  
- Source management and page processing
- Study mode and spaced repetition logic
- User profile and authentication flows

Tests are located in the `test/` directory with supporting utilities in `test/utils.py`.

## Language Learning Features

### Spaced Repetition
- Cards have states: New, Learning, Review, Relearning
- FSRS algorithm tracks stability, difficulty, repetitions, lapses
- Due card queries optimized for study session efficiency

### Multilingual Support
- German as primary language with smart context-aware translations
- Proper grammar handling for gender, cases, word types
- Audio pronunciation support for all supported languages

### Content Creation
- Interactive PDF page viewer for word selection
- Bulk operations for efficient card creation
- AI-generated contextual examples and images
