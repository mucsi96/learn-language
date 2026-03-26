package io.github.mucsi96.learnlanguage.controller;

import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.parseTimezone;
import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.startOfDayUtc;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.AddCardsToSessionRequest;
import io.github.mucsi96.learnlanguage.model.SessionStatsResponse;
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
            @RequestHeader("X-Timezone") String timezone) {
        return studySessionService.getExistingSession(sourceId, startOfDayUtc(parseTimezone(timezone)))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/source/{sourceId}/study-session")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionResponse> createSession(
            @PathVariable String sourceId,
            @RequestHeader("X-Timezone") String timezone) {
        return ResponseEntity.ok(studySessionService.createSession(sourceId, startOfDayUtc(parseTimezone(timezone))));
    }

    @GetMapping("/source/{sourceId}/study-session/current-card")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<StudySessionCardResponse> getCurrentCardBySource(
            @PathVariable String sourceId,
            @RequestHeader("X-Timezone") String timezone) {
        return studySessionService.getCurrentCardBySourceId(sourceId, startOfDayUtc(parseTimezone(timezone)))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/source/{sourceId}/study-session/stats")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<SessionStatsResponse> getSessionStats(
            @PathVariable String sourceId,
            @RequestHeader("X-Timezone") String timezone) {
        return studySessionService.getSessionStats(sourceId, startOfDayUtc(parseTimezone(timezone)))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/source/{sourceId}/study-session/skip-card/{cardId}")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<Void> skipCard(
            @PathVariable String sourceId,
            @PathVariable String cardId,
            @RequestHeader("X-Timezone") String timezone) {
        studySessionService.moveCardToBack(cardId, sourceId, startOfDayUtc(parseTimezone(timezone)), null);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/study-sessions/add-cards")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> addCardsToSessions(
            @RequestBody AddCardsToSessionRequest request,
            @RequestHeader("X-Timezone") String timezone) {
        studySessionService.addCardsToSessions(request.getCardIds(), startOfDayUtc(parseTimezone(timezone)));
        return ResponseEntity.noContent().build();
    }
}
