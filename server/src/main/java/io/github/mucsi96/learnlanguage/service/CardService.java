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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static io.github.mucsi96.learnlanguage.repository.specification.CardViewSpecifications.*;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

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

    final Specification<CardView> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, startOfDayUtc);

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
      LocalDateTime startOfDayUtc) {

    final Specification<CardView> spec = buildCardTableSpec(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        minReviewScore, maxReviewScore, startOfDayUtc);

    final int pageSize = Math.max(1, endRow - startRow);
    final int page = startRow / pageSize;
    final PageRequest pageRequest = PageRequest.of(page, pageSize, buildSort(sortField, sortDirection));

    final Page<CardView> cardPage = cardViewRepository.findAll(spec, pageRequest);

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

  private Specification<CardView> buildCardTableSpec(
      String sourceId, String readiness, String state,
      Integer minReps, Integer maxReps,
      Integer lastReviewDaysAgo, Integer lastReviewRating,
      Integer minReviewScore, Integer maxReviewScore,
      LocalDateTime startOfDayUtc) {

    Specification<CardView> spec = hasSourceId(sourceId);

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

  private CardTableRow mapToRow(CardView view) {
    final var strategy = cardTypeStrategyFactory.getStrategy(view.getCardType());
    final String label = strategy.getPrimaryText(view.getData());
    final Integer reviewDaysAgo = view.getLastReview() != null
        ? (int) ChronoUnit.DAYS.between(view.getLastReview().toLocalDate(), LocalDate.now())
        : null;

    return CardTableRow.builder()
        .id(view.getId())
        .label(label)
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
