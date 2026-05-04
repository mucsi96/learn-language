package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.WordIdRequest;
import io.github.mucsi96.learnlanguage.model.WordIdResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.KnownWordService;
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
    private final KnownWordService knownWordService;

    @PostMapping("/word-id")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordIdResponse> generateWordId(@RequestBody WordIdRequest request) {
        final String germanWord = request.getGermanWord();
        final String id = wordIdService.generateWordId(germanWord, request.getHungarianTranslation());
        final boolean exists = cardRepository.existsById(id)
                || knownWordService.isWordKnown(germanWord)
                || knownWordService.isWordKnown(wordIdService.stripGermanArticle(germanWord));
        final String germanPrefix = wordIdService.normalizeGermanWord(germanWord) + "-";
        final boolean warning = !exists && cardRepository.existsByIdStartingWithAndIdNot(germanPrefix, id);

        final WordIdResponse response = WordIdResponse.builder()
                .id(id)
                .exists(exists)
                .warning(warning)
                .build();

        return ResponseEntity.ok(response);
    }
}
