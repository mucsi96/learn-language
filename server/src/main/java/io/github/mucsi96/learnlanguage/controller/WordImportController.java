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

import io.github.mucsi96.learnlanguage.model.WordImportDecisionResponse;
import io.github.mucsi96.learnlanguage.model.WordImportQueueResponse;
import io.github.mucsi96.learnlanguage.model.WordImportRequest;
import io.github.mucsi96.learnlanguage.model.WordImportStageResponse;
import io.github.mucsi96.learnlanguage.service.WordImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/source/{sourceId}/word-import")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
public class WordImportController {

    private final WordImportService wordImportService;

    @PostMapping
    public WordImportStageResponse stageWords(
            @PathVariable String sourceId,
            @Valid @RequestBody WordImportRequest request) {
        return wordImportService.stage(sourceId, request);
    }

    @GetMapping
    public WordImportQueueResponse getQueue(@PathVariable String sourceId) {
        return wordImportService.getQueue(sourceId);
    }

    @PostMapping("/candidates/{candidateId}/known")
    public WordImportDecisionResponse markAsKnown(
            @PathVariable String sourceId,
            @PathVariable Integer candidateId) {
        return wordImportService.markAsKnown(sourceId, candidateId);
    }

    @PostMapping("/candidates/{candidateId}/card")
    public WordImportDecisionResponse createDraftCard(
            @PathVariable String sourceId,
            @PathVariable Integer candidateId) {
        return wordImportService.createDraftCard(sourceId, candidateId);
    }

    @PostMapping("/candidates/{candidateId}/undo")
    public WordImportDecisionResponse undoDecision(
            @PathVariable String sourceId,
            @PathVariable Integer candidateId) {
        return wordImportService.undoDecision(sourceId, candidateId);
    }

    @DeleteMapping
    public ResponseEntity<Void> clearQueue(@PathVariable String sourceId) {
        wordImportService.clear(sourceId);
        return ResponseEntity.noContent().build();
    }
}
