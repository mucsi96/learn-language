package io.github.mucsi96.learnlanguage.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import io.github.mucsi96.learnlanguage.extension.SourceExtensionRegistry;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import io.github.mucsi96.learnlanguage.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SourceContentController {
    private final SourceExtensionRegistry extensions;
    private final SourceContentService content;
    private final ContentCoverageService coverage;
    private final ContentListeningService listening;

    @GetMapping("/source-extensions")
    @PreAuthorize("hasAuthority('APPROLE_readDecks')")
    public List<ExtensionDescriptor> extensions() { return extensions.descriptors(); }

    @GetMapping("/source/{sourceId}/content")
    @PreAuthorize("hasAuthority('APPROLE_readDecks')")
    public List<ContentView> list(@PathVariable String sourceId, @AuthenticationPrincipal Jwt jwt) {
        final var items = content.list(sourceId, false);
        final var matching = coverage.cards(sourceId);
        final var progress = listening.progress(sourceId, user(jwt));
        return items.stream().map(item -> content.view(item, matching, progress.get(item.id()))).toList();
    }

    @PostMapping("/source/{sourceId}/content/refresh")
    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    public Map<String, String> refresh(@PathVariable String sourceId) {
        content.list(sourceId, true);
        return Map.of();
    }

    @GetMapping("/source/{sourceId}/content/{contentId}")
    @PreAuthorize("hasAuthority('APPROLE_readDecks')")
    public ContentView detail(@PathVariable String sourceId, @PathVariable UUID contentId, @AuthenticationPrincipal Jwt jwt) {
        return content.view(content.require(sourceId, contentId), coverage.cards(sourceId), listening.progress(sourceId, user(jwt)).get(contentId));
    }

    @PostMapping("/source/{sourceId}/content/{contentId}/prepare")
    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    public Map<String, String> prepare(@PathVariable String sourceId, @PathVariable UUID contentId) {
        content.prepare(sourceId, contentId);
        return Map.of();
    }

    @PostMapping("/source/{sourceId}/content/{contentId}/drafts")
    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    public Map<String, String> drafts(@PathVariable String sourceId, @PathVariable UUID contentId, @RequestBody DraftRequest request) {
        content.createDrafts(sourceId, contentId, request);
        return Map.of();
    }

    @PostMapping("/source/{sourceId}/content/{contentId}/known")
    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    public Map<String, String> known(@PathVariable String sourceId, @PathVariable UUID contentId, @RequestBody DraftRequest request) {
        content.markKnown(sourceId, contentId, request);
        return Map.of();
    }

    @PostMapping("/source/{sourceId}/content/{contentId}/playback")
    @PreAuthorize("hasAuthority('APPROLE_readDecks')")
    public ResponseEntity<Playback> playback(@PathVariable String sourceId, @PathVariable UUID contentId,
            @AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        final Playback playback = listening.start(sourceId, contentId, user(jwt));
        if (playback.kind().equals("youtube")) return ResponseEntity.ok(playback);
        final var cookie = ResponseCookie.from("contentPlayback", playback.sessionId().toString()).httpOnly(true)
                .secure(request.isSecure()).sameSite("Strict").path(playback.mediaUrl()).maxAge(14400).build();
        return ResponseEntity.ok().header("Set-Cookie", cookie.toString()).body(playback);
    }

    @GetMapping("/source/{sourceId}/content/{contentId}/media")
    public ResponseEntity<Resource> media(@PathVariable String sourceId, @PathVariable UUID contentId,
            @CookieValue("contentPlayback") UUID session) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/mpeg"))
                .header("Cache-Control", "private, no-store")
                .body(new FileSystemResource(listening.media(sourceId, contentId, session)));
    }

    @PutMapping("/source/{sourceId}/content/{contentId}/progress")
    @PreAuthorize("hasAuthority('APPROLE_readDecks')")
    public Map<String, String> progress(@PathVariable String sourceId, @PathVariable UUID contentId,
            @AuthenticationPrincipal Jwt jwt, @RequestBody ProgressRequest request) {
        listening.save(sourceId, contentId, user(jwt), request);
        return Map.of();
    }

    private String user(Jwt jwt) {
        final String oid = jwt.getClaimAsString("oid");
        return oid == null ? jwt.getSubject() : oid;
    }
}
