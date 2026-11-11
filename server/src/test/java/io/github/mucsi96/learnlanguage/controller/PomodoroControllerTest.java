package io.github.mucsi96.learnlanguage.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import io.github.mucsi96.learnlanguage.model.PomodoroState;
import io.github.mucsi96.learnlanguage.service.PomodoroService;

class PomodoroControllerTest {
    @Test
    void readsAndWritesTheAuthenticatedObjectId() {
        final PomodoroService service = mock(PomodoroService.class);
        final PomodoroController controller = new PomodoroController(service);
        final Jwt jwt = Jwt.withTokenValue("test").header("alg", "RS256")
                .subject("pairwise-subject").claim("oid", "user-object-id").build();
        final PomodoroState state = new PomodoroState(null, 600000L, 1L);
        when(service.getState("user-object-id")).thenReturn(state);

        assertThat(controller.getState(jwt).getBody()).isEqualTo(state);
        controller.saveState(jwt, state);
        verify(service).saveState("user-object-id", state);
    }

    @Test
    void usesSubjectForTokensWithoutAnObjectId() {
        final PomodoroService service = mock(PomodoroService.class);
        final PomodoroController controller = new PomodoroController(service);
        final Jwt jwt = Jwt.withTokenValue("test").header("alg", "RS256").subject("subject-only-user").build();
        final PomodoroState state = new PomodoroState(2000000000000L, null, 0L);

        controller.getState(jwt);
        controller.saveState(jwt, state);
        verify(service).getState("subject-only-user");
        verify(service).saveState("subject-only-user", state);
    }
}
