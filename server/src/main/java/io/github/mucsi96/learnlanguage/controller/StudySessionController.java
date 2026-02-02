package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.service.StudySessionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class StudySessionController {

    private final StudySessionService studySessionService;

    @GetMapping("/source/{sourceId}/study-session")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionResponse> getExistingSession(@PathVariable String sourceId) {
        return studySessionService.getExistingSession(sourceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/source/{sourceId}/study-session")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionResponse> createSession(@PathVariable String sourceId) {
        return ResponseEntity.ok(studySessionService.createSession(sourceId));
    }

    @GetMapping("/source/{sourceId}/study-session/current-card")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionCardResponse> getCurrentCardBySource(@PathVariable String sourceId) {
        return studySessionService.getCurrentCardBySourceId(sourceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/study-session/{sessionId}/current-card")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionCardResponse> getCurrentCard(@PathVariable String sessionId) {
        return studySessionService.getCurrentCard(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
