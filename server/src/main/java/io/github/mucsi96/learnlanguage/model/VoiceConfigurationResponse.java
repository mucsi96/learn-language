package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceConfigurationResponse {
    private Integer id;
    private String voiceId;
    private String model;
    private String language;
    private String displayName;
    private Boolean isEnabled;
}
