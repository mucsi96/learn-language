package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.model.CardTableResponse;
import io.github.mucsi96.learnlanguage.model.CardTableRow;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static io.github.mucsi96.learnlanguage.repository.specification.CardSpecifications.*;
import static io.github.mucsi96.learnlanguage.repository.specification.ReviewLogSpecifications.hasCardIdIn;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private final CardRepository cardRepository;
  private final ReviewLogRepository reviewLogRepository;
  private final CardTypeStrategyFactory cardTypeStrategyFactory;

  public Optional<Card> getCardById(String id) {
    return cardRepository.findById(id);
  }

  public List<Card> getCardsByIds(List<String> ids) {
    return cardRepository.findByIdIn(ids);
  }

  public Card saveCard(Card card) {
    return cardRepository.save(card);
  }

  public void deleteCardById(String id) {
    cardRepository.deleteById(id);
  }

  public List<SourceDueCardCountResponse> getDueCardCountsBySource() {
    final List<Card> dueCards = cardRepository.findAll(isDue(), Sort.by("due"));

    return dueCards.stream()
        .collect(Collectors.groupingBy(card -> card.getSource().getId()))
        .entrySet().stream()
        .flatMap(entry -> entry.getValue().stream().limit(50))
        .collect(Collectors.groupingBy(
            card -> Map.entry(card.getSource().getId(), card.getState()),
            Collectors.counting()))
        .entrySet().stream()
        .map(entry -> SourceDueCardCountResponse.builder()
            .sourceId(entry.getKey().getKey())
            .state(entry.getKey().getValue())
            .count(entry.getValue())
            .build())
        .toList();
  }

  public List<Card> getCardsByReadiness(String readiness) {
    return cardRepository.findByReadinessOrderByDueAsc(readiness);
  }

  public List<Card> getCardsMissingAudio() {
    return cardRepository.findAll()
        .stream()
        .filter(card -> !card.isInReview())
        .filter(this::isMissingAudio)
        .toList();
  }

  public List<Card> getRecentlyReviewedCards(int limit) {
    return cardRepository.findAll(
        PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "lastReview"))).getContent();
  }

  public List<SourceCardCount> getCardCountsBySource() {
    return cardRepository.countCardsBySourceGroupBySource()
        .stream()
        .map(record -> new SourceCardCount(
            (String) record[0],
            ((Long) record[1]).intValue())
        )
        .toList();
  }

  public CardTableResponse getCardTable(
      String sourceId, int startRow, int endRow,
      String sortField, String sortDirection,
      String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating) {

    final Specification<Card> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating);

    final int pageSize = Math.max(1, endRow - startRow);
    final int page = startRow / pageSize;
    final PageRequest pageRequest = PageRequest.of(page, pageSize, buildSort(sortField, sortDirection));

    final Page<Card> cardPage = cardRepository.findAll(spec, pageRequest);
    final List<Card> cards = cardPage.getContent();

    final List<String> cardIds = cards.stream().map(Card::getId).toList();
    final Map<String, ReviewLog> latestReviews = getLatestReviews(cardIds);

    final List<CardTableRow> rows = cards.stream()
        .map(card -> mapToRow(card, latestReviews))
        .toList();

    return CardTableResponse.builder()
        .rows(rows)
        .totalCount(cardPage.getTotalElements())
        .build();
  }

  public void markCardsAsKnown(List<String> cardIds) {
    cardRepository.updateReadinessByIds(cardIds, CardReadiness.KNOWN);
  }

  private Specification<Card> buildCardTableSpec(
      String sourceId, String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating) {

    Specification<Card> spec = hasSourceId(sourceId);

    if (readiness != null && !readiness.isEmpty()) {
      spec = spec.and(hasReadiness(readiness));
    }
    if (state != null && !state.isEmpty()) {
      spec = spec.and(hasState(state));
    }
    if (minReps != null) {
      spec = spec.and(hasMinReps(minReps));
    }
    if (maxReps != null) {
      spec = spec.and(hasMaxReps(maxReps));
    }
    if (lastReviewDaysAgo != null) {
      spec = spec.and(hasLastReviewAfter(lastReviewDaysAgo));
    }
    if (lastReviewRating != null) {
      spec = spec.and(hasLastReviewRating(lastReviewRating));
    }

    return spec;
  }

  private Sort buildSort(String sortField, String sortDirection) {
    if (sortField == null || sortField.isEmpty()) {
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
      default -> "due";
    };

    return Sort.by(direction, mappedField);
  }

  private Map<String, ReviewLog> getLatestReviews(List<String> cardIds) {
    if (cardIds.isEmpty()) {
      return Map.of();
    }

    return reviewLogRepository.findAll(hasCardIdIn(cardIds)).stream()
        .collect(Collectors.toMap(
            r -> r.getCard().getId(),
            Function.identity(),
            (a, b) -> a.getReview().isAfter(b.getReview()) ? a : b));
  }

  private CardTableRow mapToRow(Card card, Map<String, ReviewLog> latestReviews) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    final String label = strategy.getPrimaryText(card.getData());
    final ReviewLog review = latestReviews.get(card.getId());
    final Integer reviewDaysAgo = card.getLastReview() != null
        ? (int) ChronoUnit.DAYS.between(card.getLastReview().toLocalDate(), LocalDate.now())
        : null;

    return CardTableRow.builder()
        .id(card.getId())
        .label(label)
        .readiness(card.getReadiness())
        .state(card.getState())
        .reps(card.getReps())
        .lastReviewDaysAgo(reviewDaysAgo)
        .lastReviewRating(review != null ? review.getRating() : null)
        .lastReviewPerson(review != null && review.getLearningPartner() != null
            ? review.getLearningPartner().getName()
            : null)
        .sourcePageNumber(card.getSourcePageNumber())
        .build();
  }

  private boolean isMissingAudio(Card card) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    return strategy.isMissingAudio(card);
  }
}
