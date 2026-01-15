package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.SentenceIdRequest;
import io.github.mucsi96.learnlanguage.model.SentenceIdResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.SentenceIdService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SentenceIdController {

    private final SentenceIdService sentenceIdService;
    private final CardRepository cardRepository;

    @PostMapping("/sentence-id")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<SentenceIdResponse> generateSentenceId(@RequestBody SentenceIdRequest request) {
        String id = sentenceIdService.generateSentenceId(request.getGermanSentence());
        boolean exists = cardRepository.existsById(id);

        SentenceIdResponse response = SentenceIdResponse.builder()
                .id(id)
                .exists(exists)
                .build();

        return ResponseEntity.ok(response);
    }
}
