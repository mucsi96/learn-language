package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.SpeechIdRequest;
import io.github.mucsi96.learnlanguage.model.WordIdResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.SpeechIdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SpeechIdController {

    private final SpeechIdService speechIdService;
    private final CardRepository cardRepository;

    @PostMapping("/speech-id")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordIdResponse> generateSpeechId(@RequestBody SpeechIdRequest request) {
        final String id = speechIdService.generateSpeechId(request.getGermanSentence());
        final boolean exists = cardRepository.existsById(id);

        final WordIdResponse response = WordIdResponse.builder()
                .id(id)
                .exists(exists)
                .build();

        return ResponseEntity.ok(response);
    }
}
