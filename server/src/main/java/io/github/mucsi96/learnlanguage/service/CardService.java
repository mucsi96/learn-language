package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

  private final CardRepository cardRepository;

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

  public Optional<Card> getMostDueCardBySourceId(String sourceId) {
    return cardRepository.findMostDueCardBySourceId(sourceId);
  }

  public List<Card> getCardsByReadiness(String readiness) {
    return cardRepository.findByReadinessOrderByDueAsc(readiness);
  }
}
