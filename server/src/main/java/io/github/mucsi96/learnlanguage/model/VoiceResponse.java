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
public class VoiceResponse {
    private String id;
    private String displayName;
    private List<LanguageResponse> languages;
    private String category;
}