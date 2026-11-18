package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateDetectionResponse {
    @JsonPropertyDescription("Likely semantic duplicate pairs between new and existing IDs, excluding exact matches; empty when none exist.")
    private List<PotentialDuplicate> duplicates;
}
