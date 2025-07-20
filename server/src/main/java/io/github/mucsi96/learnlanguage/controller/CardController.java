package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.CardCreateRequest;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.service.CardService;
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
@RequestMapping("/api")
public class CardController {

  private final CardRepository cardRepository;
  private final SourceRepository sourceRepository;
  private final CardService cardService;

  @PostMapping("/card")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> createCard(@RequestBody CardCreateRequest request) throws Exception {
    // Get the source
    Source source = sourceRepository.findById(request.getSourceId())
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + request.getSourceId()));

    CardData cardData = CardData.builder()
        .word(request.getWord())
        .type(request.getType())
        .gender(request.getGender())
        .translation(request.getTranslation())
        .forms(request.getForms())
        .examples(request.getExamples())
        .audio(request.getAudio())
        .build();

    // Create a new card with FSRS defaults
    Card card = Card.builder()
        .id(request.getId())
        .source(source)
        .sourcePageNumber(request.getPageNumber())
        .data(cardData)
        .state(request.getState())
        .step(request.getStep())
        .stability(request.getStability())
        .difficulty(request.getDifficulty()) // Default difficulty from FSRS
        .elapsedDays(request.getElapsedDays())
        .scheduledDays(request.getScheduledDays())
        .reps(request.getReps())
        .lapses(request.getLapses())
        .due(LocalDateTime.now())
        .readiness(CardReadiness.IN_REVIEW)
        .build();

    cardRepository.save(card);

    return ResponseEntity.ok(new HashMap<>());
  }

  @GetMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<CardResponse> getCard(@PathVariable String cardId) throws Exception {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = card.getData();
    CardResponse cardResponse = CardResponse.fromCardData(cardData, card.getReadiness());

    return ResponseEntity.ok(cardResponse);
  }

  @PutMapping("/card/{cardId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> updateCard(@PathVariable String cardId,
      @RequestBody CardCreateRequest request) throws Exception {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = CardData.builder()
        .word(request.getWord())
        .type(request.getType())
        .gender(request.getGender())
        .translation(request.getTranslation())
        .forms(request.getForms())
        .examples(request.getExamples())
        .audio(request.getAudio())
        .build();

    card.setData(cardData);
    cardRepository.save(card);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card updated successfully");
    return ResponseEntity.ok(response);
  }

  @PostMapping("/card/{cardId}/readiness/{readiness}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> updateCardReadiness(@PathVariable String cardId, @PathVariable String readiness) throws Exception {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    card.setReadiness(readiness);
    cardRepository.save(card);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Card readiness updated to " + readiness + " successfully");
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
        .orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/cards/readiness/{readiness}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<Card>> getCardsByReadiness(@PathVariable String readiness) {
    List<Card> cards = cardService.getCardsByReadiness(readiness);
    return ResponseEntity.ok(cards);
  }
}
