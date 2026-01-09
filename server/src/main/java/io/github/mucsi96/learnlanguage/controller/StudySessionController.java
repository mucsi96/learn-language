package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @PostMapping("/source/{sourceId}/study-session")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionResponse> createSession(@PathVariable String sourceId) {
        return ResponseEntity.ok(studySessionService.createSession(sourceId));
    }

    @GetMapping("/study-session/{sessionId}/current-card")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionCardResponse> getCurrentCard(@PathVariable String sessionId) {
        return studySessionService.getCurrentCard(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/study-session/{sessionId}/card/{cardId}/complete")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> markCardCompleted(
            @PathVariable String sessionId,
            @PathVariable String cardId) {
        studySessionService.markCardCompleted(sessionId, cardId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/study-session/{sessionId}")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<Void> deleteSession(@PathVariable String sessionId) {
        studySessionService.deleteSession(sessionId);
        return ResponseEntity.noContent().build();
    }
}
