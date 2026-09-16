package io.github.mucsi96.learnlanguage.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.ProviderBillingIssue;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import io.github.mucsi96.learnlanguage.repository.ProviderBillingIssueRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProviderBillingIssueService {
    private final ProviderBillingIssueRepository repository;
    private final ProviderBillingErrorClassifier classifier;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean recordFailure(ModelProvider provider, Throwable error) {
        final boolean exhausted = classifier.isBillingFailure(provider, error);
        if (exhausted) {
            repository.recordFailure(provider.getCode(), UUID.randomUUID(), Instant.now());
        }
        return exhausted;
    }

    @Transactional(readOnly = true)
    public List<ProviderBillingIssue> getActiveIssues() {
        return repository.findAll();
    }

    @Transactional
    public void resolve(UUID occurrenceId) {
        repository.resolve(occurrenceId);
    }
}
