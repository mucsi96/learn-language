package io.github.mucsi96.learnlanguage.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ModelPricingConfigTest {

    private final ModelPricingConfig pricingConfig = new ModelPricingConfig();

    @ParameterizedTest
    @MethodSource("gptImage25Prices")
    void usesOfficialGptImage25CalculatorEstimates(String modelName, String expectedCost) {
        assertThat(pricingConfig.calculateImageCost(modelName, 1))
            .isEqualByComparingTo(expectedCost);
    }

    @Test
    void calculatesActualUsageFromOfficialTokenRates() {
        assertThat(pricingConfig.calculateGptImage25Cost(20, 100, 1_756))
            .isEqualByComparingTo(new BigDecimal("0.05358"));
    }

    @Test
    void doesNotAssignAFixedPriceToAutoQuality() {
        assertThatThrownBy(() -> pricingConfig.calculateImageCost("gpt-image-2.5-sunburst-auto", 1))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("No fixed image pricing for model: gpt-image-2.5-sunburst-auto");
    }

    private static Stream<Arguments> gptImage25Prices() {
        return Stream.of("sunburst", "flare")
            .flatMap(model -> Stream.of(
                Arguments.of("gpt-image-2.5-" + model + "-low", "0.00588"),
                Arguments.of("gpt-image-2.5-" + model + "-medium", "0.01317"),
                Arguments.of("gpt-image-2.5-" + model + "-high", "0.05268"),
                Arguments.of("gpt-image-2.5-" + model + "-xhigh", "0.09366"),
                Arguments.of("gpt-image-2.5-" + model + "-max", "0.21072")));
    }
}
