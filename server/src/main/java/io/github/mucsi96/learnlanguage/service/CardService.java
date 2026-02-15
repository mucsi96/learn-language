package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static io.github.mucsi96.learnlanguage.repository.specification.CardSpecifications.*;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private record LatestReviewInfo(Integer rating, String learningPartnerName) {}

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
    return cardRepository.findTop50MostDueGroupedByStateAndSourceId().stream()
        .map(row -> SourceDueCardCountResponse.builder()
            .sourceId((String) row[0])
            .state((String) row[1])
            .count(((Number) row[2]).longValue())
            .build())
        .toList();
  }

  public List<Card> getCardsByReadiness(String readiness) {
    return cardRepository.findByReadinessOrderByDueAsc(readiness);
  }

  public List<Card> getCardsMissingAudio() {
    return cardRepository.findAllWithSource()
        .stream()
        .filter(card -> !card.isInReview())
        .filter(this::isMissingAudio)
        .toList();
  }

  public List<Card> getRecentlyReviewedCards(int limit) {
    return cardRepository.findTopWithSourceOrderByLastReviewDesc(PageRequest.of(0, limit));
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

  public List<String> getFilteredCardIds(
      String sourceId,
      String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      LocalDateTime startOfDayUtc) {

    final Specification<Card> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, startOfDayUtc);

    return cardRepository.findAll(spec).stream()
        .map(Card::getId)
        .toList();
  }

  public CardTableResponse getCardTable(
      String sourceId, int startRow, int endRow,
      String sortField, String sortDirection,
      String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      LocalDateTime startOfDayUtc) {

    final Specification<Card> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, startOfDayUtc);

    final int pageSize = Math.max(1, endRow - startRow);
    final int page = startRow / pageSize;
    final PageRequest pageRequest = PageRequest.of(page, pageSize, buildSort(sortField, sortDirection));

    final Page<Card> cardPage = cardRepository.findAll(spec, pageRequest);
    final List<Card> cards = cardPage.getContent();

    final List<String> cardIds = cards.stream().map(Card::getId).toList();
    final Map<String, LatestReviewInfo> latestReviews = getLatestReviews(cardIds);

    final List<CardTableRow> rows = cards.stream()
        .map(card -> mapToRow(card, latestReviews))
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

  private Specification<Card> buildCardTableSpec(
      String sourceId, String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      LocalDateTime startOfDayUtc) {

    Specification<Card> spec = hasSourceId(sourceId);

    if (StringUtils.hasText(readiness)) {
      spec = spec.and(hasReadiness(readiness));
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

  private Map<String, LatestReviewInfo> getLatestReviews(List<String> cardIds) {
    if (cardIds.isEmpty()) {
      return Map.of();
    }

    return reviewLogRepository.findLatestReviewInfoByCardIds(cardIds).stream()
        .collect(Collectors.toMap(
            row -> (String) row[0],
            row -> new LatestReviewInfo(
                ((Number) row[1]).intValue(),
                (String) row[2])));
  }

  private CardTableRow mapToRow(Card card, Map<String, LatestReviewInfo> latestReviews) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    final String label = strategy.getPrimaryText(card.getData());
    final LatestReviewInfo review = latestReviews.get(card.getId());
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
        .lastReviewRating(review != null ? review.rating() : null)
        .lastReviewPerson(review != null ? review.learningPartnerName() : null)
        .reviewScore(card.getReviewScore())
        .sourcePageNumber(card.getSourcePageNumber())
        .build();
  }

  private boolean isMissingAudio(Card card) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    return strategy.isMissingAudio(card);
  }
}
