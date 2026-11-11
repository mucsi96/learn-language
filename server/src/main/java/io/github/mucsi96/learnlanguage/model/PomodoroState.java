package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record PomodoroState(
        @Positive Long endsAt,
        @Positive @Max(1500000) Long remainingMs,
        @NotNull @PositiveOrZero Long version) {
    @AssertTrue
    @JsonIgnore
    public boolean isValidState() {
        return (endsAt == null) != (remainingMs == null);
    }
}
