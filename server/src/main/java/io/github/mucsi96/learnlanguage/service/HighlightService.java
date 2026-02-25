package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Highlight;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.HighlightResponse;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.HighlightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class HighlightService {

    private final HighlightRepository highlightRepository;
    private final CardRepository cardRepository;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final WordIdService wordIdService;
    private final ChatModelSettingService chatModelSettingService;

    public List<HighlightResponse> getHighlightsBySource(Source source) {
        final List<Highlight> highlights = highlightRepository.findBySourceOrderByCreatedAtDesc(source);

        final Set<String> existingCardIds = highlights.stream()
                .map(Highlight::getCandidateCardId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        final Set<String> foundCardIds = existingCardIds.isEmpty()
                ? Set.of()
                : cardRepository.findAllById(existingCardIds).stream()
                        .map(card -> card.getId())
                        .collect(Collectors.toSet());

        return highlights.stream()
                .map(h -> HighlightResponse.builder()
                        .id(h.getId())
                        .candidateCardId(h.getCandidateCardId())
                        .cardExists(h.getCandidateCardId() != null && foundCardIds.contains(h.getCandidateCardId()))
                        .highlightedWord(h.getHighlightedWord())
                        .sentence(h.getSentence())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public int deleteHighlightsWithCards(Source source) {
        final List<Highlight> highlights = highlightRepository.findBySourceOrderByCreatedAtDesc(source);

        final Set<String> candidateCardIds = highlights.stream()
                .map(Highlight::getCandidateCardId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        if (candidateCardIds.isEmpty()) {
            return 0;
        }

        final Set<String> existingCardIds = cardRepository.findAllById(candidateCardIds).stream()
                .map(card -> card.getId())
                .collect(Collectors.toSet());

        if (existingCardIds.isEmpty()) {
            return 0;
        }

        return highlightRepository.deleteBySourceAndCandidateCardIdIn(source, existingCardIds);
    }

    public void persistHighlight(Source source, String highlightedWord, String sentence) {
        if (highlightRepository.existsBySourceAndHighlightedWordAndSentence(
                source, highlightedWord, sentence)) {
            return;
        }

        final String candidateCardId = generateCandidateCardId(highlightedWord, sentence);

        final Highlight highlight = Highlight.builder()
                .source(source)
                .highlightedWord(highlightedWord)
                .sentence(sentence)
                .candidateCardId(candidateCardId)
                .createdAt(LocalDateTime.now())
                .build();
        highlightRepository.save(highlight);
    }

    private String generateCandidateCardId(String highlightedWord, String sentence) {
        try {
            final Map<OperationType, String> primaryModels = chatModelSettingService.getPrimaryModelByOperation();

            final String classificationModelName = primaryModels.get(OperationType.CLASSIFICATION);
            final String translationModelName = primaryModels.get(OperationType.TRANSLATION);

            if (classificationModelName == null || translationModelName == null) {
                log.warn("Primary models not configured for classification or translation");
                return null;
            }

            final ChatModel classificationModel = ChatModel.fromString(classificationModelName);
            final ChatModel translationModel = ChatModel.fromString(translationModelName);

            final NormalizeWordResponse normalizeResponse = wordNormalizationService.normalize(
                    highlightedWord, sentence, classificationModel);

            final TranslateWordRequest translateRequest = TranslateWordRequest.builder()
                    .word(normalizeResponse.getNormalizedWord())
                    .examples(List.of(sentence))
                    .build();

            final TranslationResponse translationResponse = translationService.translate(
                    translateRequest, "hu", translationModel);

            return wordIdService.generateWordId(
                    normalizeResponse.getNormalizedWord(),
                    translationResponse.getTranslation());
        } catch (Exception e) {
            log.warn("Failed to generate candidate card ID for '{}': {}", highlightedWord, e.getMessage());
            return null;
        }
    }
}
