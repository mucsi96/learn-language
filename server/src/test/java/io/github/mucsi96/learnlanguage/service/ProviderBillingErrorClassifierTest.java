package io.github.mucsi96.learnlanguage.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpClientErrorException;

import com.google.genai.errors.ApiException;
import io.github.mucsi96.learnlanguage.model.ModelProvider;

class ProviderBillingErrorClassifierTest {
    private final ProviderBillingErrorClassifier classifier = new ProviderBillingErrorClassifier();

    static Stream<Arguments> billingErrors() {
        return Stream.of(
            Arguments.of(ModelProvider.OPENAI, 429, "{\"error\":{\"code\":\"insufficient_quota\"}}"),
            Arguments.of(ModelProvider.OPENAI, 429, "You have no credits remaining."),
            Arguments.of(ModelProvider.ANTHROPIC, 400, "Your credit balance is too low to access the Anthropic API."),
            Arguments.of(ModelProvider.ANTHROPIC, 402, "Check your payment method."),
            Arguments.of(ModelProvider.ANTHROPIC, 429, "Your organization has reached its monthly spend cap."),
            Arguments.of(ModelProvider.XAI, 403, "Your team doesn't have any credits yet. Please purchase credits."),
            Arguments.of(ModelProvider.XAI, 429, "You have exceeded your spending limit."),
            Arguments.of(ModelProvider.GOOGLE, 403, "{\"reason\":\"BILLING_DISABLED\"}"),
            Arguments.of(ModelProvider.GOOGLE, 400, "Please enable billing on your Google Cloud project."),
            Arguments.of(ModelProvider.ELEVENLABS, 401, "{\"detail\":{\"status\":\"quota_exceeded\"}}"),
            Arguments.of(ModelProvider.ELEVENLABS, 402, "{\"detail\":{\"code\":\"insufficient_credits\"}}"),
            Arguments.of(ModelProvider.IDEOGRAM, 400, "Insufficient balance"),
            Arguments.of(ModelProvider.IDEOGRAM, 402, "Payment required")
        );
    }

    @ParameterizedTest
    @MethodSource("billingErrors")
    void recognizesBillingFailuresEvenWhenWrapped(ModelProvider provider, int status, String body) {
        final var response = HttpClientErrorException.create(HttpStatusCode.valueOf(status), "Provider error",
            HttpHeaders.EMPTY, body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        assertTrue(classifier.isBillingFailure(provider, new RuntimeException("Generation failed", response)));
    }

    static Stream<Arguments> temporaryErrors() {
        return Arrays.stream(ModelProvider.values()).flatMap(provider -> Stream.of(
            Arguments.of(provider, 429, "Rate limit exceeded. Retry in 30 seconds."),
            Arguments.of(provider, 401, "Invalid API key"),
            Arguments.of(provider, 403, "Permission denied"),
            Arguments.of(provider, 400, "Invalid input")
        ));
    }

    @ParameterizedTest
    @MethodSource("temporaryErrors")
    void doesNotTurnOtherErrorsIntoBillingAlerts(ModelProvider provider, int status, String body) {
        final var response = HttpClientErrorException.create(HttpStatusCode.valueOf(status), "Provider error",
            HttpHeaders.EMPTY, body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        assertFalse(classifier.isBillingFailure(provider, response));
    }

    @Test
    void distinguishesGeminiRateQuotaFromBilling() {
        assertFalse(classifier.isBillingFailure(ModelProvider.GOOGLE, new ApiException(429,
            "You exceeded your current quota, please check your plan and billing details. Retry in 30 seconds.",
            "RESOURCE_EXHAUSTED")));
        assertTrue(classifier.isBillingFailure(ModelProvider.GOOGLE, new ApiException(403,
            "Billing is disabled for this project. Please enable billing.", "PERMISSION_DENIED")));
    }

    @Test
    void recognizesSpringAiElevenLabsErrorWithoutACause() {
        assertTrue(classifier.isBillingFailure(ModelProvider.ELEVENLABS,
            new NonTransientAiException("HTTP 401 - {\"detail\":{\"status\":\"quota_exceeded\"}}")));
        assertFalse(classifier.isBillingFailure(ModelProvider.ELEVENLABS,
            new NonTransientAiException("HTTP 429 - {\"detail\":{\"status\":\"too_many_concurrent_requests\"}}")));
    }

    @Test
    void doesNotClassifyApplicationErrorsByMessageAlone() {
        assertFalse(classifier.isBillingFailure(ModelProvider.OPENAI, new RuntimeException("insufficient_quota")));
    }
}
