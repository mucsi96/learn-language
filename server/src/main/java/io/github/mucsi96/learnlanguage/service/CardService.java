package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private final CardRepository cardRepository;

  public Optional<Card> getCardById(String id) {
    return cardRepository.findById(id);
  }

  public List<Card> getCardsByIds(List<String> ids) {
    return cardRepository.findByIdIn(ids);
  }

  public List<Card> getCardsByGermanWords(List<String> germanWords) {
    return cardRepository.findByGermanWords(germanWords);
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
    if (card == null || card.getData() == null) {
      return false;
    }

    var cardData = card.getData();
    var audioList = cardData.getAudio() != null ? cardData.getAudio() : List.<AudioData>of();

    if (hasText(cardData.getWord()) && !hasAudioForText(audioList, cardData.getWord())) {
      return true;
    }

    Map<String, String> translation = cardData.getTranslation();
    if (translation != null) {
      var hungarianTranslation = translation.get("hu");
      if (hasText(hungarianTranslation) && !hasAudioForText(audioList, hungarianTranslation)) {
        return true;
      }
    }

    if (cardData.getExamples() != null) {
      var selectedExample = cardData.getExamples().stream()
          .filter(example -> Boolean.TRUE.equals(example.getIsSelected()))
          .findFirst();

      if (selectedExample.isPresent()) {
        var example = selectedExample.get();

        if (hasText(example.getDe()) && !hasAudioForText(audioList, example.getDe())) {
          return true;
        }

        if (hasText(example.getHu()) && !hasAudioForText(audioList, example.getHu())) {
          return true;
        }
      }
    }

    return false;
  }

  private boolean hasAudioForText(List<AudioData> audioList, String text) {
    if (!hasText(text)) {
      return false;
    }

    return audioList.stream()
        .filter(audio -> audio != null && hasText(audio.getText()))
        .anyMatch(audio -> text.equals(audio.getText()));
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
