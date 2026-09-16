package io.github.mucsi96.learnlanguage.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import io.github.mucsi96.learnlanguage.entity.ProviderBillingIssue;

public interface ProviderBillingIssueRepository extends JpaRepository<ProviderBillingIssue, String> {
    @Modifying
    @Query(value = """
        INSERT INTO learn_language.provider_billing_issues
            (provider, occurrence_id, first_detected_at, last_detected_at)
        VALUES (:provider, :occurrenceId, :detectedAt, :detectedAt)
        ON CONFLICT (provider) DO UPDATE
        SET occurrence_id = EXCLUDED.occurrence_id, last_detected_at = EXCLUDED.last_detected_at
        """, nativeQuery = true)
    void recordFailure(String provider, UUID occurrenceId, Instant detectedAt);

    @Modifying
    @Query("DELETE FROM ProviderBillingIssue i WHERE i.occurrenceId = :occurrenceId")
    void resolve(UUID occurrenceId);
}
