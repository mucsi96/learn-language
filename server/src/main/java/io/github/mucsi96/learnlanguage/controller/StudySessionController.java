package io.github.mucsi96.learnlanguage.controller;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
    public ResponseEntity<StudySessionResponse> getExistingSession(
            @PathVariable String sourceId,
            @RequestHeader(value = "X-Timezone", required = true) String timezone) {
        return studySessionService.getExistingSession(sourceId, startOfDay(timezone))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/source/{sourceId}/study-session")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionResponse> createSession(
            @PathVariable String sourceId,
            @RequestHeader(value = "X-Timezone", required = true) String timezone) {
        return ResponseEntity.ok(studySessionService.createSession(sourceId, startOfDay(timezone)));
    }

    @GetMapping("/source/{sourceId}/study-session/current-card")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionCardResponse> getCurrentCardBySource(
            @PathVariable String sourceId,
            @RequestHeader(value = "X-Timezone", required = true) String timezone) {
        return studySessionService.getCurrentCardBySourceId(sourceId, startOfDay(timezone))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    private static LocalDateTime startOfDay(String timezone) {
        try {
            return LocalDate.now(ZoneId.of(timezone)).atStartOfDay();
        } catch (DateTimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid timezone: " + timezone);
        }
    }
}
