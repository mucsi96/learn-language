package io.github.mucsi96.learnlanguage.service;

import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.createdOnOrAfter;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.CardView;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySessionCard;
import io.github.mucsi96.learnlanguage.model.CardTableResponse;
import io.github.mucsi96.learnlanguage.model.CardTableRow;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.CardViewRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.PredicateSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import lombok.Builder;
import lombok.Data;

import static io.github.mucsi96.learnlanguage.repository.specification.CardViewSpecifications.*;

@Service
@RequiredArgsConstructor
public class CardService {

  @Builder
  @Data
  public static class SourceStats {
    private final int cardCount;
    private final int draftCardCount;
    private final int flaggedCardCount;
    private final int unhealthyCardCount;
    private final Map<String, Integer> stateCounts;
    private final Map<String, Integer> readinessCounts;
  }

  private final CardRepository cardRepository;
  private final CardViewRepository cardViewRepository;
  private final ReviewLogRepository reviewLogRepository;
  private final StudySessionRepository studySessionRepository;
  private final CardTypeStrategyFactory cardTypeStrategyFactory;
  private final FileStorageService fileStorageService;

  public Optional<Card> getCardById(String id) {
    return cardRepository.findById(id);
  }

  public Card saveCard(Card card) {
    return cardRepository.save(card);
  }

  @Transactional
  public void deleteCardById(String id) {
    cardRepository.deleteById(id);
  }

  public List<SourceDueCardCountResponse> getDueCardCountsBySource(LocalDateTime startOfDay) {
    final List<StudySession> activeSessions = studySessionRepository.findAll(createdOnOrAfter(startOfDay));

    if (!activeSessions.isEmpty()) {
      final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);

      return activeSessions.stream()
          .flatMap(session -> studySessionRepository.findWithCardsById(session.getId())
              .stream()
              .flatMap(loaded -> loaded.getCards().stream()
                  .map(StudySessionCard::getCard)
                  .filter(Card::isReady)
                  .filter(card -> !card.getDue().isAfter(cutoff))
                  .collect(Collectors.groupingBy(Card::getState, Collectors.counting()))
                  .entrySet().stream()
                  .map(entry -> SourceDueCardCountResponse.builder()
                      .sourceId(loaded.getSource().getId())
                      .state(entry.getKey())
                      .count(entry.getValue())
                      .build())))
          .toList();
    }

    return cardRepository.findTop50MostDueGroupedByStateAndSourceId().stream()
        .map(row -> SourceDueCardCountResponse.builder()
            .sourceId(row.getSourceId())
            .state(row.getState())
            .count(row.getCount())
            .build())
        .toList();
  }

  public List<Card> getCardsByReadiness(CardReadiness readiness) {
    return cardRepository.findByReadinessOrderByDueAsc(readiness);
  }

  public List<Card> getCardsMissingAudio() {
    return cardRepository.findAll()
        .stream()
        .filter(card -> !card.isInReview())
        .filter(card -> cardTypeStrategyFactory.getStrategy(card.getSource().getCardType())
            .isMissingAudio(card.getData()))
        .toList();
  }

  public List<Card> getRecentlyReviewedCards(int limit) {
    return cardRepository.findTopByOrderByLastReviewDesc(PageRequest.of(0, limit));
  }

  public Map<String, SourceStats> getSourceStats() {
    final Map<String, Map<String, Integer>> stateCounts = new HashMap<>();
    final Map<String, Map<String, Integer>> readinessCounts = new HashMap<>();
    final Map<String, Integer> cardCounts = new HashMap<>();
    final Map<String, Integer> draftCounts = new HashMap<>();
    final Map<String, Integer> flaggedCounts = new HashMap<>();
    final Map<String, Integer> unhealthyCounts = new HashMap<>();

    cardRepository.getSourceCardStats().forEach(row -> {
      final var sourceId = row.getSourceId();
      final var readiness = row.getReadiness();
      final var state = row.getState();
      final var flagged = row.getFlagged();
      final var unhealthy = row.getUnhealthy();
      final var count = row.getCount().intValue();

      final var isDraft = "DRAFT".equals(readiness);

      if (isDraft) {
        draftCounts.merge(sourceId, count, Integer::sum);
      } else {
        cardCounts.merge(sourceId, count, Integer::sum);
        stateCounts.computeIfAbsent(sourceId, k -> new HashMap<>())
            .merge(state, count, Integer::sum);
      }

      readinessCounts.computeIfAbsent(sourceId, k -> new HashMap<>())
          .merge(readiness, count, Integer::sum);

      if (flagged) {
        flaggedCounts.merge(sourceId, count, Integer::sum);
      }
      if (unhealthy) {
        unhealthyCounts.merge(sourceId, count, Integer::sum);
      }
    });

    return readinessCounts.keySet().stream()
        .collect(Collectors.toMap(
            sourceId -> sourceId,
            sourceId -> SourceStats.builder()
                .cardCount(cardCounts.getOrDefault(sourceId, 0))
                .draftCardCount(draftCounts.getOrDefault(sourceId, 0))
                .flaggedCardCount(flaggedCounts.getOrDefault(sourceId, 0))
                .unhealthyCardCount(unhealthyCounts.getOrDefault(sourceId, 0))
                .stateCounts(stateCounts.getOrDefault(sourceId, Map.of()))
                .readinessCounts(readinessCounts.getOrDefault(sourceId, Map.of()))
                .build()
        ));
  }

  public List<Card> getFlaggedCards() {
    return cardRepository.findByFlaggedTrueOrderByDueAsc();
  }

  @Transactional
  public void markCardsAsDraft(List<String> cardIds) {
    cardRepository.updateReadinessByIds(cardIds, CardReadiness.DRAFT);
  }

  public List<String> getFilteredCardIds(
      String sourceId,
      String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      String cardFilter, Boolean flagged, Boolean unhealthy,
      LocalDateTime startOfDayUtc) {

    final PredicateSpecification<CardView> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, cardFilter, flagged, unhealthy, startOfDayUtc);

    return cardViewRepository.findAll(spec).stream()
        .map(CardView::getId)
        .toList();
  }

  public CardTableResponse getCardTable(
      String sourceId, int startRow, int endRow,
      String sortField, String sortDirection,
      String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      String cardFilter, Boolean flagged, Boolean unhealthy,
      LocalDateTime startOfDayUtc) {

    final PredicateSpecification<CardView> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, cardFilter, flagged, unhealthy, startOfDayUtc);

    final int pageSize = Math.max(1, endRow - startRow);
    final int page = startRow / pageSize;
    final PageRequest pageRequest = PageRequest.of(page, pageSize, buildSort(sortField, sortDirection));

    final Page<CardView> cardPage = cardViewRepository.findAll(Specification.where(spec), pageRequest);

    final List<CardTableRow> rows = cardPage.getContent().stream()
        .map(this::mapToRow)
        .toList();

    return CardTableResponse.builder()
        .rows(rows)
        .totalCount(cardPage.getTotalElements())
        .build();
  }

  @Transactional
  public void markCardsAsKnown(List<String> cardIds) {
    cardRepository.updateReadinessByIds(cardIds, CardReadiness.KNOWN);
  }

  @Transactional
  public void deleteCardsByIds(List<String> cardIds) {
    reviewLogRepository.deleteByCardIdIn(cardIds);
    cardRepository.deleteAllById(cardIds);
  }

  @Transactional
  public void deleteAudioForCards(List<String> cardIds) {
    final List<Card> cards = cardRepository.findByIdInOrderByIdAsc(cardIds);

    cards.stream()
        .filter(card -> card.getData() != null && card.getData().getAudio() != null)
        .forEach(card -> {
          card.getData().getAudio().stream()
              .map(AudioData::getId)
              .forEach(audioId -> fileStorageService.deleteFile("audio/%s.mp3".formatted(audioId)));
          card.getData().setAudio(null);
        });

    cardRepository.saveAll(cards);
  }

  public void refreshCardView() {
    cardViewRepository.refresh();
  }

  private PredicateSpecification<CardView> buildCardTableSpec(
      String sourceId, String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      String cardFilter, Boolean flagged, Boolean unhealthy,
      LocalDateTime startOfDayUtc) {

    PredicateSpecification<CardView> spec = hasSourceId(sourceId);

    if (StringUtils.hasText(readiness)) {
      final List<CardReadiness> readinessValues = Arrays.stream(readiness.split(","))
          .map(CardReadiness::valueOf)
          .toList();
      spec = spec.and(hasReadinessIn(readinessValues));
    }
    if (StringUtils.hasText(state)) {
      spec = spec.and(hasState(state));
    }
    if (minReps != null) {
      spec = spec.and(hasMinReps(minReps));
    }
    if (maxReps != null) {
      spec = spec.and(hasMaxReps(maxReps));
    }
    if (lastReviewDaysAgo != null) {
      spec = spec.and(hasLastReviewAfter(lastReviewDaysAgo, startOfDayUtc));
    }
    if (lastReviewRating != null) {
      spec = spec.and(hasLastReviewRating(lastReviewRating));
    }
    if (minReviewScore != null) {
      spec = spec.and(hasMinReviewScore(minReviewScore));
    }
    if (maxReviewScore != null) {
      spec = spec.and(hasMaxReviewScore(maxReviewScore));
    }
    if (StringUtils.hasText(cardFilter)) {
      spec = spec.and(hasCardFilter(cardFilter));
    }
    if (Boolean.TRUE.equals(flagged)) {
      spec = spec.and(isFlagged());
    }
    if (Boolean.TRUE.equals(unhealthy)) {
      spec = spec.and(isUnhealthy());
    }

    return spec;
  }

  private Sort buildSort(String sortField, String sortDirection) {
    if (!StringUtils.hasText(sortField)) {
      return Sort.by(Sort.Direction.ASC, "due");
    }

    final Sort.Direction direction = "desc".equalsIgnoreCase(sortDirection)
        ? Sort.Direction.DESC
        : Sort.Direction.ASC;

    final String mappedField = switch (sortField) {
      case "reps" -> "reps";
      case "lastReviewDaysAgo" -> "lastReview";
      case "state" -> "state";
      case "readiness" -> "readiness";
      case "reviewScore" -> "reviewScore";
      default -> "due";
    };

    return Sort.by(direction, mappedField);
  }

  private CardTableRow mapToRow(CardView view) {
    final Integer reviewDaysAgo = view.getLastReview() != null
        ? (int) ChronoUnit.DAYS.between(view.getLastReview().toLocalDate(), LocalDate.now())
        : null;

    return CardTableRow.builder()
        .id(view.getId())
        .readiness(view.getReadiness())
        .state(view.getState())
        .reps(view.getReps())
        .lastReviewDaysAgo(reviewDaysAgo)
        .lastReviewRating(view.getLastReviewRating())
        .lastReviewPerson(view.getLastReviewLearningPartnerName())
        .reviewScore(view.getReviewScore())
        .sourcePageNumber(view.getSourcePageNumber())
        .build();
  }
}
