package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.LearningPartnerService;
import io.github.mucsi96.learnlanguage.util.BeanUtils;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CardController {

  private final CardRepository cardRepository;
  private final SourceRepository sourceRepository;
  private final CardService cardService;
  private final ReviewLogRepository reviewLogRepository;
  private final LearningPartnerService learningPartnerService;

  @PostMapping("/card")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> createCard(@RequestBody Card request) throws Exception {
    // Get the source
    Source source = sourceRepository.findById(request.getSource().getId())
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + request.getSource().getId()));

    request.setSource(source);

    cardRepository.save(request);

    return ResponseEntity.ok(new HashMap<>());
  }

  @GetMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<Card> getCard(@PathVariable String cardId) throws Exception {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    return ResponseEntity.ok(card);
  }

  @PutMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> updateCard(@PathVariable String cardId,
      @RequestBody CardUpdateRequest request) throws Exception {
    Card existingCard = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    boolean isGrading = request.getState() != null && request.getReps() != null;

    if (request.getData() != null) existingCard.setData(request.getData());
    if (request.getReadiness() != null) existingCard.setReadiness(request.getReadiness());
    if (request.getDue() != null) existingCard.setDue(request.getDue());
    if (request.getStability() != null) existingCard.setStability(request.getStability());
    if (request.getDifficulty() != null) existingCard.setDifficulty(request.getDifficulty());
    if (request.getElapsedDays() != null) existingCard.setElapsedDays(request.getElapsedDays());
    if (request.getScheduledDays() != null) existingCard.setScheduledDays(request.getScheduledDays());
    if (request.getLearningSteps() != null) existingCard.setLearningSteps(request.getLearningSteps());
    if (request.getReps() != null) existingCard.setReps(request.getReps());
    if (request.getLapses() != null) existingCard.setLapses(request.getLapses());
    if (request.getState() != null) existingCard.setState(request.getState());
    if (request.getLastReview() != null) existingCard.setLastReview(request.getLastReview());

    cardRepository.save(existingCard);

    if (isGrading) {
      LearningPartner partner = null;
      if (request.getLearningPartnerId() != null) {
        partner = learningPartnerService.getLearningPartnerById(request.getLearningPartnerId());
      }

      int rating = mapStateToRating(request.getState(), request.getReps());

      ReviewLog reviewLog = ReviewLog.builder()
          .card(existingCard)
          .learningPartner(partner)
          .rating(rating)
          .state(request.getState())
          .due(request.getDue())
          .stability(request.getStability() != null ? request.getStability().doubleValue() : 0.0)
          .difficulty(request.getDifficulty() != null ? request.getDifficulty().doubleValue() : 0.0)
          .elapsedDays(request.getElapsedDays() != null ? request.getElapsedDays().doubleValue() : 0.0)
          .scheduledDays(request.getScheduledDays() != null ? request.getScheduledDays().doubleValue() : 0.0)
          .learningSteps(request.getLearningSteps())
          .review(LocalDateTime.now())
          .build();

      reviewLogRepository.save(reviewLog);
    }

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card updated successfully");
    return ResponseEntity.ok(response);
  }

  private int mapStateToRating(String state, Integer reps) {
    if ("NEW".equals(state) || "RELEARNING".equals(state)) {
      return 1;
    }
    if (reps != null && reps == 1) {
      return 3;
    }
    return 3;
  }

  @DeleteMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteCard(@PathVariable String cardId) throws Exception {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    cardRepository.delete(card);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card deleted successfully");
    return ResponseEntity.ok(response);
  }

  @GetMapping("/source/{sourceId}/most-due-card")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<Card> getMostDueCard(@PathVariable String sourceId) {
    return cardService.getMostDueCardBySourceId(sourceId)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  @GetMapping("/cards/readiness/{readiness}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<Card>> getCardsByReadiness(@PathVariable String readiness) {
    List<Card> cards = cardService.getCardsByReadiness(readiness);
    return ResponseEntity.ok(cards);
  }

  @GetMapping("/cards/missing-audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<Card>> getCardsMissingAudio() {
    List<Card> cards = cardService.getCardsMissingAudio();
    return ResponseEntity.ok(cards);
  }

  @GetMapping("/cards/sample")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<Card>> getSampleCards() {
    List<Card> cards = cardService.getRandomReadyCards(10);
    return ResponseEntity.ok(cards);
  }

  @PutMapping("/card/{cardId}/audio/{audioId}/select")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> selectVoiceForCard(@PathVariable String cardId, @PathVariable String audioId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = card.getData();
    if (cardData != null && cardData.getAudio() != null) {
      // Set all audio as not selected first
      cardData.getAudio().forEach(audio -> audio.setSelected(false));

      // Find and select the specified audio
      cardData.getAudio().stream()
          .filter(audio -> audioId.equals(audio.getId()))
          .findFirst()
          .ifPresent(audio -> audio.setSelected(true));

      cardRepository.save(card);
    }

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Voice selected successfully");
    return ResponseEntity.ok(response);
  }

  @PostMapping("/card/{cardId}/audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> addAudioToCard(@PathVariable String cardId, @RequestBody AudioData audioData) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = card.getData();
    if (cardData == null) {
      cardData = new CardData();
      card.setData(cardData);
    }

    if (cardData.getAudio() == null) {
      cardData.setAudio(new java.util.ArrayList<>());
    }

    cardData.getAudio().add(audioData);
    cardRepository.save(card);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Audio added successfully");
    return ResponseEntity.ok(response);
  }
}
