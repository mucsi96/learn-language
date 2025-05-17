package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.WordRequest;
import io.github.mucsi96.learnlanguage.model.WordTypeResponse;
import io.github.mucsi96.learnlanguage.service.WordTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/word-type")
@RequiredArgsConstructor
public class WordTypeController {

    private final WordTypeService wordTypeService;

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordTypeResponse> getWordType(@RequestBody WordRequest word) {
        String type = wordTypeService.detectWordType(word.getWord());

        WordTypeResponse response = WordTypeResponse.builder()
                .word(word.getWord())
                .type(type)
                .build();

        return ResponseEntity.ok(response);
    }
}
