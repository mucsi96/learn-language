package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.SentenceIdRequest;
import io.github.mucsi96.learnlanguage.model.WordIdResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.SentenceIdService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SentenceIdController {

    private final SentenceIdService sentenceIdService;
    private final CardRepository cardRepository;

    @PostMapping("/sentence-id")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordIdResponse> generateSentenceId(@Valid @RequestBody SentenceIdRequest request) {
        final String id = sentenceIdService.generateSentenceId(request.getGermanSentence());
        final boolean exists = cardRepository.existsById(id);

        final WordIdResponse response = WordIdResponse.builder()
                .id(id)
                .exists(exists)
                .build();

        return ResponseEntity.ok(response);
    }
}
