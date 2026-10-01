package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import io.github.mucsi96.learnlanguage.service.AdjectiveFormsBackfillService.Degrees;

class AdjectiveFormsBackfillServiceTest {
    @Test
    void acceptsComparisonDegreesAndExplicitlyNonGradableAdjectives() {
        assertThat(new Degrees(true, List.of("besser", "am besten")).validatedForms())
                .containsExactly("besser", "am besten");
        assertThat(new Degrees(false, List.of()).validatedForms()).isEmpty();
    }

    @ParameterizedTest
    @MethodSource("invalidDegrees")
    void rejectsIncompleteOrContradictoryResponses(Degrees degrees) {
        assertThatThrownBy(degrees::validatedForms).isInstanceOf(IllegalStateException.class);
    }

    static Stream<Degrees> invalidDegrees() {
        return Stream.of(new Degrees(null, List.of()), new Degrees(true, null),
                new Degrees(true, List.of()), new Degrees(true, List.of("besser")),
                new Degrees(true, Arrays.asList(null, "am besten")),
                new Degrees(true, List.of(" ", "am besten")),
                new Degrees(true, List.of("besser", "beste")),
                new Degrees(true, List.of("gut", "besser", "am besten")),
                new Degrees(false, List.of("besser", "am besten")));
    }
}
