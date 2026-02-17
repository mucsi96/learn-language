package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.WordIdRequest;
import io.github.mucsi96.learnlanguage.model.WordIdResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.WordIdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class WordIdController {

    private final WordIdService wordIdService;
    private final CardRepository cardRepository;

    @PostMapping("/word-id")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordIdResponse> generateWordId(@RequestBody WordIdRequest request) {
        final String id = wordIdService.generateWordId(request.getGermanWord(), request.getHungarianTranslation());
        final boolean exists = cardRepository.existsById(id);
        final String germanPrefix = wordIdService.normalizeGermanWord(request.getGermanWord()) + "-";
        final boolean warning = !exists && cardRepository.existsByIdStartingWithAndIdNot(germanPrefix, id);

        final WordIdResponse response = WordIdResponse.builder()
                .id(id)
                .exists(exists)
                .warning(warning)
                .build();

        return ResponseEntity.ok(response);
    }
}
