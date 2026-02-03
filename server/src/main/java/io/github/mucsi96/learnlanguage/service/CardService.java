package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardTableRowResponse;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private final CardRepository cardRepository;
  private final CardTypeStrategyFactory cardTypeStrategyFactory;
  private final ReviewLogRepository reviewLogRepository;

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
    return cardRepository.findTop50MostDueGroupedByStateAndSourceId()
        .stream()
        .map(record -> SourceDueCardCountResponse.builder()
            .sourceId((String) record[0])
            .state((String) record[1])
            .count(((Long) record[2]))
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

  public List<Card> getRandomReadyCards(int limit) {
    return cardRepository.findRandomReadyCards(limit);
  }

  public List<SourceCardCount> getCardCountsBySource() {
    return cardRepository.countBySourceGroupBySource()
        .stream()
        .map(record -> new SourceCardCount(
            (String) record[0],
            ((Long) record[1]).intValue())
        )
        .toList();
  }

  public List<CardTableRowResponse> getCardTableRows() {
    final List<Card> allCards = cardRepository.findAll();
    final List<String> cardIds = allCards.stream().map(Card::getId).toList();

    final Map<String, ReviewLog> latestReviewByCardId = cardIds.isEmpty()
        ? Map.of()
        : reviewLogRepository.findLatestReviewByCardIds(cardIds)
            .stream()
            .collect(Collectors.toMap(
                rl -> rl.getCard().getId(),
                Function.identity()
            ));

    return allCards.stream()
        .map(card -> {
          final var strategy = cardTypeStrategyFactory.getStrategy(card);
          final var latestReview = latestReviewByCardId.get(card.getId());
          final var sourceType = card.getSource().getSourceType();

          return CardTableRowResponse.builder()
              .id(card.getId())
              .sourceName(card.getSource().getName())
              .sourceType(sourceType != null ? sourceType.getCode() : null)
              .label(strategy.getPrimaryText(card.getData()))
              .reviewCount(card.getReps())
              .lastReviewDate(card.getLastReview())
              .lastReviewGrade(latestReview != null ? latestReview.getRating() : null)
              .lastReviewPerson(latestReview != null && latestReview.getLearningPartner() != null
                  ? latestReview.getLearningPartner().getName()
                  : null)
              .readiness(card.getReadiness())
              .sourceId(card.getSource().getId())
              .sourcePageNumber(card.getSourcePageNumber())
              .build();
        })
        .toList();
  }

  public void markCardsAsKnown(List<String> cardIds) {
    final List<Card> cards = cardRepository.findByIdIn(cardIds);
    cards.forEach(card -> card.setReadiness(CardReadiness.KNOWN));
    cardRepository.saveAll(cards);
  }

  private boolean isMissingAudio(Card card) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    return strategy.isMissingAudio(card);
  }
}
