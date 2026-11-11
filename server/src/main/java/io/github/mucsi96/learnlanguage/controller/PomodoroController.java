package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.PomodoroState;
import io.github.mucsi96.learnlanguage.service.PomodoroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('APPROLE_readDecks')")
public class PomodoroController {
    private final PomodoroService service;

    @GetMapping("/pomodoro")
    public ResponseEntity<PomodoroState> getState(@AuthenticationPrincipal final Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.getState(userId(jwt)));
    }

    @PutMapping("/pomodoro")
    public PomodoroState saveState(@AuthenticationPrincipal final Jwt jwt,
            @Valid @RequestBody final PomodoroState state) {
        return service.saveState(userId(jwt), state);
    }

    private String userId(final Jwt jwt) {
        final String oid = jwt.getClaimAsString("oid");
        return oid == null ? jwt.getSubject() : oid;
    }
}
