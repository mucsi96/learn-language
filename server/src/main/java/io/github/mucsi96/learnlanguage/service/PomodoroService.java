package io.github.mucsi96.learnlanguage.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.model.PomodoroState;
import io.github.mucsi96.learnlanguage.repository.PomodoroTimerRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PomodoroService {
    private final PomodoroTimerRepository repository;

    public PomodoroState getState(final String userId) {
        return repository.findById(userId)
                .map(timer -> new PomodoroState(timer.getEndsAt(), timer.getRemainingMs(), timer.getVersion()))
                .orElse(new PomodoroState(null, null, 0L));
    }

    @Transactional
    public PomodoroState saveState(final String userId, final PomodoroState state) {
        final int updated = state.version() == 0
                ? repository.insertState(userId, state.endsAt(), state.remainingMs(), state.version())
                : repository.updateState(userId, state.endsAt(), state.remainingMs(), state.version());
        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pomodoro changed in another window; retry the action");
        }
        return new PomodoroState(state.endsAt(), state.remainingMs(), state.version() + 1);
    }
}
