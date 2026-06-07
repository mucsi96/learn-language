package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateDetectionRequest {
    private List<String> newIds;
    @NotBlank
    private String sourceId;
}
