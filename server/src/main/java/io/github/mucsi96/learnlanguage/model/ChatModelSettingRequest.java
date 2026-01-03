package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatModelSettingRequest {
    @NotBlank
    private String modelName;

    @NotBlank
    private String operationType;

    @Builder.Default
    private Boolean isEnabled = true;

    @Builder.Default
    private Boolean isPrimary = false;
}
