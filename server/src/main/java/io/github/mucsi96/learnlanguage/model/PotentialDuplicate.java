package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PotentialDuplicate {
    @JsonPropertyDescription("An ID from the supplied newIds array.")
    private String newId;
    @JsonPropertyDescription("A semantically overlapping ID from the supplied existingIds array.")
    private String existingId;
    @JsonPropertyDescription("Short English explanation of why the pair covers the same concept.")
    private String reason;
}
