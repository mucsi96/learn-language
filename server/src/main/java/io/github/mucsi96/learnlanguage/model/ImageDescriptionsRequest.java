package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ImageDescriptionsRequest(@NotBlank String input, @Size(max = 500) String context,
    @Positive int count) {
}
