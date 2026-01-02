package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelSettingsResponse {
    private String operationType;
    private String operationDisplayName;
    private List<ModelSetting> models;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelSetting {
        private String modelName;
        private boolean isEnabled;
    }
}
