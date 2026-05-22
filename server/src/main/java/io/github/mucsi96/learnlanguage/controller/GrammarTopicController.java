package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.GrammarTopicRequest;
import io.github.mucsi96.learnlanguage.model.GrammarTopicResponse;
import io.github.mucsi96.learnlanguage.service.GrammarTopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/grammar-topics")
@RequiredArgsConstructor
public class GrammarTopicController {

    private final GrammarTopicService grammarTopicService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public List<GrammarTopicResponse> getAllGrammarTopics() {
        return grammarTopicService.getAllGrammarTopics();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public GrammarTopicResponse createGrammarTopic(
            @Valid @RequestBody GrammarTopicRequest request) {
        return grammarTopicService.createGrammarTopic(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public GrammarTopicResponse updateGrammarTopic(
            @PathVariable Integer id,
            @Valid @RequestBody GrammarTopicRequest request) {
        return grammarTopicService.updateGrammarTopic(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteGrammarTopic(@PathVariable Integer id) {
        grammarTopicService.deleteGrammarTopic(id);
        return ResponseEntity.noContent().build();
    }
}
