package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.WordRequest;
import io.github.mucsi96.learnlanguage.model.WordTypeResponse;
import io.github.mucsi96.learnlanguage.service.WordTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class WordTypeController {

    private final WordTypeService wordTypeService;

    @PostMapping("/word-type")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<WordTypeResponse> getWordType(
            @RequestBody WordRequest word,
            @RequestParam ChatModel model) {
        String type = wordTypeService.detectWordType(word.getWord(), model);

        WordTypeResponse response = WordTypeResponse.builder()
                .word(word.getWord())
                .type(type)
                .build();

        return ResponseEntity.ok(response);
    }
}
