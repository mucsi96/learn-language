package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class CardController {

  private final CardRepository cardRepository;
  private final SourceRepository sourceRepository;
  private final CardService cardService;

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
      @RequestBody Card request) throws Exception {
    Card existingCard = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    // Update fields from request, keeping existing values for null fields
    if (request.getData() != null) existingCard.setData(request.getData());
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
    if (request.getReadiness() != null) existingCard.setReadiness(request.getReadiness());
    cardRepository.save(existingCard);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card updated successfully");
    return ResponseEntity.ok(response);
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
}
