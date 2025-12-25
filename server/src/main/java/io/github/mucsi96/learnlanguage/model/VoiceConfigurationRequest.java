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
public class VoiceConfigurationRequest {
    @NotBlank
    private String voiceId;

    @NotBlank
    private String model;

    @NotBlank
    private String language;

    private String displayName;

    @Builder.Default
    private Boolean isEnabled = true;
}
