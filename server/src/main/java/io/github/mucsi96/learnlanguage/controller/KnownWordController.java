package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.KnownWordsImportRequest;
import io.github.mucsi96.learnlanguage.model.KnownWordsImportResponse;
import io.github.mucsi96.learnlanguage.model.KnownWordsResponse;
import io.github.mucsi96.learnlanguage.service.KnownWordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/known-words")
@RequiredArgsConstructor
public class KnownWordController {

    private final KnownWordService knownWordService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public KnownWordsResponse getKnownWords() {
        return KnownWordsResponse.builder()
                .words(knownWordService.getAllKnownWords())
                .count(knownWordService.getKnownWordsCount())
                .build();
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public KnownWordsImportResponse importWords(@Valid @RequestBody KnownWordsImportRequest request) {
        int importedCount = knownWordService.importFromText(request.getText());
        return KnownWordsImportResponse.builder()
                .importedCount(importedCount)
                .build();
    }

    @GetMapping("/check/{wordId}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Boolean> isWordIdKnown(@PathVariable String wordId) {
        return ResponseEntity.ok(knownWordService.isWordIdKnown(wordId));
    }

    @DeleteMapping("/{word}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteWord(@PathVariable String word) {
        knownWordService.deleteWord(word);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteAllWords() {
        knownWordService.deleteAllWords();
        return ResponseEntity.noContent().build();
    }
}
