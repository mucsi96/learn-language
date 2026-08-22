package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NavigableSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.entity.WordImportCandidate;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordImportCandidateResponse;
import io.github.mucsi96.learnlanguage.model.WordImportDecisionResponse;
import io.github.mucsi96.learnlanguage.model.WordImportQueueResponse;
import io.github.mucsi96.learnlanguage.model.WordImportRequest;
import io.github.mucsi96.learnlanguage.model.WordImportStageResponse;
import io.github.mucsi96.learnlanguage.model.WordImportStatsResponse;
import io.github.mucsi96.learnlanguage.model.WordImportStatus;
import io.github.mucsi96.learnlanguage.model.WordImportWordRequest;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.WordImportCandidateRepository;
import io.github.mucsi96.learnlanguage.repository.WordImportPendingCountProjection;
import io.github.mucsi96.learnlanguage.repository.WordImportStatusCountProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WordImportService {

    private static final int MAX_STORED_EXAMPLES = 5;
    private static final int MAX_CARD_EXAMPLES = 3;
    private static final Duration RETENTION = Duration.ofDays(14);
    private static final String HUNGARIAN = "hu";

    private enum StagingOutcome {
        STAGED,
        ALREADY_KNOWN,
        EXISTING_CARD,
        ALREADY_STAGED
    }

    private final WordImportCandidateRepository wordImportCandidateRepository;
    private final CardRepository cardRepository;
    private final KnownWordService knownWordService;
    private final SourceService sourceService;
    private final CardService cardService;
    private final WordIdService wordIdService;
    private final TranslationService translationService;
    private final ChatModelSettingService chatModelSettingService;

    @Transactional
    public WordImportStageResponse stage(String sourceId, WordImportRequest request) {
        final Source source = getWordListSource(sourceId);
        final Set<String> detectionSourceIds = sourceService.getDetectionSourceIds(sourceId);
        final Set<String> knownWords = knownWordService.getKnownWordSet();
        final Set<String> stagedLemmas = wordImportCandidateRepository.findBySource_Id(sourceId).stream()
                .map(candidate -> normalize(candidate.getLemma()))
                .collect(Collectors.toUnmodifiableSet());
        final NavigableSet<String> existingCardIds = new TreeSet<>(
                cardRepository.findIdsBySource_IdIn(detectionSourceIds));

        final List<WordImportWordRequest> uniqueWords = request.getWords().stream()
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                word -> normalize(word.getLemma()),
                                word -> word,
                                (existing, replacement) -> existing,
                                LinkedHashMap::new),
                        map -> List.copyOf(map.values())));

        final Map<StagingOutcome, List<WordImportWordRequest>> byOutcome = uniqueWords.stream()
                .collect(Collectors.groupingBy(
                        word -> classify(word, knownWords, stagedLemmas, existingCardIds)));

        final List<WordImportWordRequest> newWords = byOutcome.getOrDefault(StagingOutcome.STAGED, List.of());

        stageCandidates(source, newWords);

        final int fileDuplicates = request.getWords().size() - uniqueWords.size();

        return WordImportStageResponse.builder()
                .totalWords(request.getWords().size())
                .stagedCount(newWords.size())
                .alreadyKnownCount(byOutcome.getOrDefault(StagingOutcome.ALREADY_KNOWN, List.of()).size())
                .existingCardCount(byOutcome.getOrDefault(StagingOutcome.EXISTING_CARD, List.of()).size())
                .duplicateCount(
                        fileDuplicates + byOutcome.getOrDefault(StagingOutcome.ALREADY_STAGED, List.of()).size())
                .stats(getStats(sourceId))
                .build();
    }

    private void stageCandidates(Source source, List<WordImportWordRequest> words) {
        try {
            wordImportCandidateRepository.saveAllAndFlush(words.stream()
                    .map(word -> toCandidate(source, word))
                    .toList());
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Another import for this source is already in progress");
        }
    }

    public WordImportQueueResponse getQueue(String sourceId) {
        getWordListSource(sourceId);

        final List<WordImportCandidateResponse> candidates = wordImportCandidateRepository
                .findBySource_IdAndStatusOrderByOccurrenceCountDescLemmaAsc(sourceId, WordImportStatus.PENDING)
                .stream()
                .map(WordImportService::toCandidateResponse)
                .toList();

        return WordImportQueueResponse.builder()
                .candidates(candidates)
                .stats(getStats(sourceId))
                .build();
    }

    @Transactional
    public WordImportDecisionResponse markAsKnown(String sourceId, Integer candidateId) {
        final WordImportCandidate candidate = getPendingCandidate(sourceId, candidateId);

        final boolean knownWordCreated = knownWordService.addKnownWord(candidate.getLemma());

        return toDecisionResponse(wordImportCandidateRepository.save(candidate.toBuilder()
                .status(WordImportStatus.KNOWN)
                .knownWordCreated(knownWordCreated)
                .build()));
    }

    public WordImportDecisionResponse createDraftCard(String sourceId, Integer candidateId) {
        final WordImportCandidate candidate = getPendingCandidate(sourceId, candidateId);
        final List<String> germanExamples = candidate.getExamples().stream().limit(MAX_CARD_EXAMPLES).toList();

        final TranslationResponse translation = translationService.translate(
                TranslateWordRequest.builder()
                        .word(candidate.getLemma())
                        .examples(germanExamples)
                        .build(),
                HUNGARIAN,
                chatModelSettingService.getPrimaryModel(OperationType.TRANSLATION));

        final String cardId = wordIdService.generateWordId(candidate.getLemma(), translation.getTranslation());

        cardService.getCardById(cardId).orElseGet(
                () -> cardService.saveCard(buildDraftCard(cardId, candidate, germanExamples, translation)));

        return toDecisionResponse(wordImportCandidateRepository.save(
                candidate.toBuilder().status(WordImportStatus.CARD_CREATED).cardId(cardId).build()));
    }

    @Transactional
    public WordImportDecisionResponse undoDecision(String sourceId, Integer candidateId) {
        final WordImportCandidate candidate = getCandidate(sourceId, candidateId);

        revertDecision(candidate);

        return toDecisionResponse(wordImportCandidateRepository.save(candidate.toBuilder()
                .status(WordImportStatus.PENDING)
                .cardId(null)
                .knownWordCreated(null)
                .build()));
    }

    @Transactional
    public void clear(String sourceId) {
        getWordListSource(sourceId);
        wordImportCandidateRepository.deleteBySource_Id(sourceId);
    }

    public Map<String, Integer> getPendingCountsBySource() {
        return wordImportCandidateRepository.countPendingGroupedBySource().stream()
                .collect(Collectors.toUnmodifiableMap(
                        WordImportPendingCountProjection::getSourceId,
                        projection -> projection.getCount().intValue()));
    }

    @Scheduled(fixedRate = 3_600_000L)
    @Transactional
    public void cleanupOld() {
        final int removed = wordImportCandidateRepository.deleteByCreatedAtBefore(Instant.now().minus(RETENTION));

        if (removed > 0) {
            log.info("Cleaned up {} stale word import candidate(s)", removed);
        }
    }

    private StagingOutcome classify(WordImportWordRequest word, Set<String> knownWords, Set<String> stagedLemmas,
            NavigableSet<String> existingCardIds) {
        final String normalizedLemma = normalize(word.getLemma());

        if (knownWords.contains(normalizedLemma)) {
            return StagingOutcome.ALREADY_KNOWN;
        }

        if (stagedLemmas.contains(normalizedLemma)) {
            return StagingOutcome.ALREADY_STAGED;
        }

        final String cardIdPrefix = wordIdService.normalizeGermanWord(word.getLemma()) + "-";
        final String closestCardId = existingCardIds.ceiling(cardIdPrefix);

        return closestCardId != null && closestCardId.startsWith(cardIdPrefix)
                ? StagingOutcome.EXISTING_CARD
                : StagingOutcome.STAGED;
    }

    private WordImportCandidate toCandidate(Source source, WordImportWordRequest word) {
        return WordImportCandidate.builder()
                .source(source)
                .lemma(word.getLemma().trim())
                .wordType(word.getWordType())
                .occurrenceCount(word.getOccurrenceCount())
                .examples(word.getExamples().stream()
                        .filter(Objects::nonNull)
                        .filter(example -> !example.isBlank())
                        .limit(MAX_STORED_EXAMPLES)
                        .toList())
                .status(WordImportStatus.PENDING)
                .createdAt(Instant.now())
                .build();
    }

    private Card buildDraftCard(String cardId, WordImportCandidate candidate, List<String> germanExamples,
            TranslationResponse translation) {
        final List<String> translatedExamples = Optional.ofNullable(translation.getExamples()).orElse(List.of());

        final List<ExampleData> examples = IntStream.range(0, germanExamples.size())
                .mapToObj(index -> ExampleData.builder()
                        .de(germanExamples.get(index))
                        .hu(index < translatedExamples.size() ? translatedExamples.get(index) : null)
                        .build())
                .toList();

        return Card.builder()
                .id(cardId)
                .source(candidate.getSource())
                .sourcePageNumber(1)
                .type(CardType.VOCABULARY)
                .data(CardData.builder()
                        .word(candidate.getLemma())
                        .translation(Map.of(HUNGARIAN, translation.getTranslation()))
                        .examples(examples)
                        .build())
                .readiness(CardReadiness.DRAFT)
                .state("NEW")
                .due(LocalDateTime.now())
                .stability(0f)
                .difficulty(0f)
                .elapsedDays(0f)
                .scheduledDays(0f)
                .learningSteps(0)
                .reps(0)
                .lapses(0)
                .build();
    }

    private void revertDecision(WordImportCandidate candidate) {
        if (candidate.getStatus() == WordImportStatus.KNOWN
                && Boolean.TRUE.equals(candidate.getKnownWordCreated())) {
            knownWordService.deleteWord(candidate.getLemma());
        }

        if (candidate.getStatus() == WordImportStatus.CARD_CREATED && candidate.getCardId() != null) {
            cardService.getCardById(candidate.getCardId())
                    .filter(card -> card.getSource().getId().equals(candidate.getSource().getId()))
                    .ifPresent(this::deleteDraftCard);
        }
    }

    private void deleteDraftCard(Card card) {
        if (card.getReadiness() != CardReadiness.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The card created for this word is no longer a draft: " + card.getId());
        }

        cardService.deleteCardById(card.getId());
    }

    private WordImportStatsResponse getStats(String sourceId) {
        final Map<WordImportStatus, Long> counts = wordImportCandidateRepository.countGroupedByStatus(sourceId)
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        WordImportStatusCountProjection::getStatus,
                        WordImportStatusCountProjection::getCount));

        return WordImportStatsResponse.builder()
                .pendingCount(countOf(counts, WordImportStatus.PENDING))
                .knownCount(countOf(counts, WordImportStatus.KNOWN))
                .cardCount(countOf(counts, WordImportStatus.CARD_CREATED))
                .build();
    }

    private static int countOf(Map<WordImportStatus, Long> counts, WordImportStatus status) {
        return counts.getOrDefault(status, 0L).intValue();
    }

    private WordImportDecisionResponse toDecisionResponse(WordImportCandidate candidate) {
        return WordImportDecisionResponse.builder()
                .candidateId(candidate.getId())
                .status(candidate.getStatus())
                .cardId(candidate.getCardId())
                .stats(getStats(candidate.getSource().getId()))
                .build();
    }

    private static WordImportCandidateResponse toCandidateResponse(WordImportCandidate candidate) {
        return WordImportCandidateResponse.builder()
                .id(candidate.getId())
                .lemma(candidate.getLemma())
                .wordType(candidate.getWordType())
                .occurrenceCount(candidate.getOccurrenceCount())
                .examples(candidate.getExamples())
                .build();
    }

    private WordImportCandidate getPendingCandidate(String sourceId, Integer candidateId) {
        final WordImportCandidate candidate = getCandidate(sourceId, candidateId);

        if (candidate.getStatus() != WordImportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Word import candidate is already decided: " + candidate.getLemma());
        }

        return candidate;
    }

    private WordImportCandidate getCandidate(String sourceId, Integer candidateId) {
        return wordImportCandidateRepository.findByIdAndSource_Id(candidateId, sourceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Word import candidate not found with id: " + candidateId));
    }

    private Source getWordListSource(String sourceId) {
        final Source source = sourceService.getSourceById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

        if (source.getSourceType() != SourceType.WORD_LIST) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Word import is only available for word list sources: " + sourceId);
        }

        return source;
    }

    private static String normalize(String lemma) {
        return lemma.trim().toLowerCase(Locale.ROOT);
    }
}
