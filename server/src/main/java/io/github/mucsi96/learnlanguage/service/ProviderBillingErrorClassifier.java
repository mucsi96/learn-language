package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;

import com.anthropic.errors.AnthropicServiceException;
import com.google.genai.errors.ApiException;
import com.openai.errors.OpenAIServiceException;

import io.github.mucsi96.learnlanguage.model.ModelProvider;

@Component
public class ProviderBillingErrorClassifier {
    private static final Pattern SPRING_AI_STATUS = Pattern.compile("^HTTP\\s+(\\d{3})\\b");
    private static final List<String> BILLING_MARKERS = List.of(
        "insufficient_quota", "insufficient_credits", "insufficient credits", "insufficient balance",
        "credit balance is too low", "no credits remaining", "out of credits", "not enough credits",
        "credits have been exhausted", "credit balance has been exhausted", "payment_required",
        "payment required", "billing_error", "billing_hard_limit_reached");

    public boolean isBillingFailure(ModelProvider provider, Throwable error) {
        return Stream.iterate(error, cause -> cause != null, Throwable::getCause)
            .flatMap(this::responseError)
            .anyMatch(response -> response.status() >= 400 && response.status() < 500
                && (response.status() == 402 || matches(provider, response.details().toLowerCase(Locale.ROOT))));
    }

    private boolean matches(ModelProvider provider, String details) {
        if (BILLING_MARKERS.stream().anyMatch(details::contains)) {
            return true;
        }
        return switch (provider) {
            case OPENAI -> details.contains("exceeded your current quota");
            case ANTHROPIC -> containsAny(details, List.of("spend limit", "spending limit", "monthly spend cap"));
            case GOOGLE -> containsAny(details, List.of("billing_disabled", "billing_not_active",
                "billing is disabled", "billing is not enabled", "billing account is disabled",
                "billing account is closed", "billing account is suspended", "billing account is not active",
                "enable billing", "paid plan is required"));
            case XAI -> containsAny(details, List.of("doesn't have any credits", "does not have any credits",
                "exhausted your credits", "exceeded your spending limit", "reached your spending limit"));
            case ELEVENLABS -> containsAny(details, List.of("quota_exceeded", "subscription_required"));
            case IDEOGRAM -> containsAny(details, List.of("insufficient funds", "balance is too low"));
        };
    }

    private boolean containsAny(String details, List<String> markers) {
        return markers.stream().anyMatch(details::contains);
    }

    private Stream<ResponseError> responseError(Throwable error) {
        return switch (error) {
            case OpenAIServiceException response -> Stream.of(new ResponseError(response.statusCode(),
                response.body() + " " + response.getMessage() + " " + response.code()));
            case AnthropicServiceException response -> Stream.of(new ResponseError(response.statusCode(),
                response.body() + " " + response.getMessage()));
            case ApiException response -> Stream.of(new ResponseError(response.code(),
                response.status() + " " + response.message()));
            case RestClientResponseException response -> Stream.of(new ResponseError(response.getStatusCode().value(),
                response.getResponseBodyAsString()));
            case NonTransientAiException response -> Stream.ofNullable(response.getMessage())
                .flatMap(message -> {
                    final var matcher = SPRING_AI_STATUS.matcher(message);
                    return matcher.find()
                        ? Stream.of(new ResponseError(Integer.parseInt(matcher.group(1)), message))
                        : Stream.empty();
                });
            default -> Stream.empty();
        };
    }

    private record ResponseError(int status, String details) {}
}
