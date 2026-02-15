package io.github.mucsi96.learnlanguage.controller;

import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.parseTimezone;
import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.startOfDayUtc;

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
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardResponse;
import io.github.mucsi96.learnlanguage.model.CardTableResponse;
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

  private static final int MIN_FSRS_RATING = 1;
  private static final int MAX_FSRS_RATING = 4;

  private final CardRepository cardRepository;
  private final SourceRepository sourceRepository;
  private final CardService cardService;
  private final ReviewLogRepository reviewLogRepository;
  private final LearningPartnerService learningPartnerService;

  @GetMapping("/source/{sourceId}/cards")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<CardTableResponse> getCards(
      @PathVariable String sourceId,
      @RequestHeader(value = "X-Timezone", required = true) String timezone,
      @RequestParam(defaultValue = "0") int startRow,
      @RequestParam(defaultValue = "100") int endRow,
      @RequestParam(required = false) String sortField,
      @RequestParam(required = false) String sortDirection,
      @RequestParam(required = false) String readiness,
      @RequestParam(required = false) String state,
      @RequestParam(required = false) Integer minReps,
      @RequestParam(required = false) Integer maxReps,
      @RequestParam(required = false) Integer lastReviewDaysAgo,
      @RequestParam(required = false) Integer lastReviewRating) {

    final CardTableResponse response = cardService.getCardTable(
        sourceId, startRow, endRow, sortField, sortDirection,
        readiness, state, minReps, maxReps, lastReviewDaysAgo, lastReviewRating,
        startOfDayUtc(parseTimezone(timezone)));

    return ResponseEntity.ok(response);
  }

  @GetMapping("/source/{sourceId}/card-ids")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<List<String>> getFilteredCardIds(
      @PathVariable String sourceId,
      @RequestHeader(value = "X-Timezone", required = true) String timezone,
      @RequestParam(required = false) String readiness,
      @RequestParam(required = false) String state,
      @RequestParam(required = false) Integer minReps,
      @RequestParam(required = false) Integer maxReps,
      @RequestParam(required = false) Integer lastReviewDaysAgo,
      @RequestParam(required = false) Integer lastReviewRating) {

    final List<String> ids = cardService.getFilteredCardIds(
        sourceId, readiness, state, minReps, maxReps,
        lastReviewDaysAgo, lastReviewRating,
        startOfDayUtc(parseTimezone(timezone)));

    return ResponseEntity.ok(ids);
  }

  @PostMapping("/cards/refresh-view")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> refreshCardView() {
    cardService.refreshCardView();
    return ResponseEntity.ok(Map.of("detail", "Card view refreshed"));
  }

  @PutMapping("/cards/mark-known")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> markCardsAsKnown(@RequestBody List<String> cardIds) {
    cardService.markCardsAsKnown(cardIds);

    return ResponseEntity.ok(Map.of("detail",
        String.format("%d card(s) marked as known", cardIds.size())));
  }

  @DeleteMapping("/cards")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteCards(@RequestBody List<String> cardIds) {
    cardService.deleteCardsByIds(cardIds);

    return ResponseEntity.ok(Map.of("detail",
        String.format("%d card(s) deleted", cardIds.size())));
  }

  @DeleteMapping("/cards/audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteCardsAudio(@RequestBody List<String> cardIds) {
    cardService.deleteAudioForCards(cardIds);

    return ResponseEntity.ok(Map.of("detail",
        String.format("Audio deleted for %d card(s)", cardIds.size())));
  }

  @PostMapping("/card")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> createCard(@RequestBody Card request) throws Exception {
    Source source = sourceRepository.findById(request.getSource().getId())
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + request.getSource().getId()));

    request.setSource(source);

    cardService.saveCard(request);

    return ResponseEntity.ok(new HashMap<>());
  }

  @GetMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<CardResponse> getCard(@PathVariable String cardId) throws Exception {
    final Card card = cardService.getCardById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    return ResponseEntity.ok(CardResponse.from(card));
  }

  @PutMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> updateCard(@PathVariable String cardId,
      @RequestBody CardUpdateRequest request) throws Exception {
    Card existingCard = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    boolean isGrading = request.getRating() != null;

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
      if (request.getStability() == null || request.getDifficulty() == null
          || request.getElapsedDays() == null || request.getScheduledDays() == null) {
        throw new IllegalArgumentException(
            "stability, difficulty, elapsedDays, and scheduledDays are required for grading");
      }

      if (request.getRating() < MIN_FSRS_RATING || request.getRating() > MAX_FSRS_RATING) {
        throw new IllegalArgumentException(
            String.format("rating must be between %d and %d", MIN_FSRS_RATING, MAX_FSRS_RATING));
      }

      LearningPartner partner = null;
      if (request.getLearningPartnerId() != null) {
        partner = learningPartnerService.getLearningPartnerById(request.getLearningPartnerId());
      }

      final ReviewLog reviewLog = ReviewLog.builder()
          .card(existingCard)
          .learningPartner(partner)
          .rating(request.getRating())
          .state(request.getState())
          .due(request.getDue())
          .stability(request.getStability().doubleValue())
          .difficulty(request.getDifficulty().doubleValue())
          .elapsedDays(request.getElapsedDays().doubleValue())
          .scheduledDays(request.getScheduledDays().doubleValue())
          .learningSteps(request.getLearningSteps())
          .review(LocalDateTime.now())
          .build();

      reviewLogRepository.save(reviewLog);
    }

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card updated successfully");
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteCard(@PathVariable String cardId) throws Exception {
    cardService.deleteCardById(cardId);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card deleted successfully");
    return ResponseEntity.ok(response);
  }

  @GetMapping("/cards/readiness/{readiness}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<CardResponse>> getCardsByReadiness(@PathVariable String readiness) {
    final List<CardResponse> cards = cardService.getCardsByReadiness(readiness).stream()
        .map(CardResponse::from)
        .toList();
    return ResponseEntity.ok(cards);
  }

  @GetMapping("/cards/missing-audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<CardResponse>> getCardsMissingAudio() {
    final List<CardResponse> cards = cardService.getCardsMissingAudio().stream()
        .map(CardResponse::from)
        .toList();
    return ResponseEntity.ok(cards);
  }

  @GetMapping("/cards/sample")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<CardResponse>> getSampleCards() {
    final List<CardResponse> cards = cardService.getRecentlyReviewedCards(10).stream()
        .map(CardResponse::from)
        .toList();
    return ResponseEntity.ok(cards);
  }

  @PutMapping("/card/{cardId}/audio/{audioId}/select")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> selectVoiceForCard(@PathVariable String cardId, @PathVariable String audioId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = card.getData();
    if (cardData != null && cardData.getAudio() != null) {
      cardData.getAudio().forEach(audio -> audio.setSelected(false));

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
