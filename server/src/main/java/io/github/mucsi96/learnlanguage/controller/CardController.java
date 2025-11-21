package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.CardValidationService;
import io.github.mucsi96.learnlanguage.util.BeanUtils;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ValidationData;
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
  private final CardValidationService cardValidationService;

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

    // Copy only non-null properties from request to existing card
    BeanUtils.copyNonNullProperties(request, existingCard);
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

  @GetMapping("/cards/missing-audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<List<Card>> getCardsMissingAudio() {
    List<Card> cards = cardService.getCardsMissingAudio();
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

  @PostMapping("/card/{cardId}/validate")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<ValidationData> validateCard(@PathVariable String cardId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new ResourceNotFoundException("Card not found with id: " + cardId));

    CardData cardData = card.getData();
    if (cardData == null || cardData.getPdfText() == null) {
      return ResponseEntity.badRequest().build();
    }

    ValidationData validationData = cardValidationService.validateCard(
        cardData.getPdfText(),
        cardData.getType()
    );

    cardData.setValidation(validationData);
    cardRepository.save(card);

    return ResponseEntity.ok(validationData);
  }
}
