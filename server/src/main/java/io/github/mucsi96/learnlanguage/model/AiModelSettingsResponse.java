package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelSettingsResponse {
    private Integer id;
    private String operationType;
    private String operationDisplayName;
    private ModelType modelType;
    private String modelName;
    private LocalDateTime updatedAt;
}
