package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElevenLabsVoice {
    @JsonProperty("voice_id")
    private String voiceId;
    
    private String name;
    
    @JsonProperty("verified_languages")
    private List<ElevenLabsLanguage> verifiedLanguages;
    
    private ElevenLabsSharing sharing;
    
    private ElevenLabsLabels labels;
}