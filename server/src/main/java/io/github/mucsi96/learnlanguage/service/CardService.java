package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private final CardRepository cardRepository;
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

  private boolean isMissingAudio(Card card) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    return strategy.isMissingAudio(card);
  }
}
