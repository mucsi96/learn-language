package io.github.mucsi96.learnlanguage.controller;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.service.ProviderBillingIssueService;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/provider-billing-issues")
@RequiredArgsConstructor
public class ProviderBillingIssueController {
    private final ProviderBillingIssueService service;

    public record BillingIssueResponse(UUID occurrenceId, String provider, String providerName, Instant firstDetectedAt,
        Instant lastDetectedAt, String message, String billingUrl, boolean canResolve) {}

    @GetMapping
    @PreAuthorize("hasAnyAuthority('APPROLE_readDecks', 'APPROLE_createDeck')")
    public List<BillingIssueResponse> getActiveIssues(Authentication authentication) {
        final boolean canResolve = authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("APPROLE_createDeck"));
        return service.getActiveIssues().stream()
            .map(issue -> {
                final var provider = ModelProvider.fromCode(issue.getProvider());
                return new BillingIssueResponse(issue.getOccurrenceId(), provider.getCode(), provider.getDisplayName(),
                    issue.getFirstDetectedAt(), issue.getLastDetectedAt(),
                    provider.getBillingMessage(), provider.getBillingUrl(), canResolve);
            })
            .toList();
    }

    @DeleteMapping("/{occurrenceId}")
    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    public void resolve(@PathVariable UUID occurrenceId) {
        service.resolve(occurrenceId);
    }
}
