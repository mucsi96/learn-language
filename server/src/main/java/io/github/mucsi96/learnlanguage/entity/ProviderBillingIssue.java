package io.github.mucsi96.learnlanguage.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "provider_billing_issues", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderBillingIssue {
    @Id
    private String provider;
    private UUID occurrenceId;
    private Instant firstDetectedAt;
    private Instant lastDetectedAt;
}
