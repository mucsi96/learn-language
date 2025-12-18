package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelResponse {
    private String modelName;
    private String output;
    private Double priceUsd;
    private Long executionTimeMs;
}
