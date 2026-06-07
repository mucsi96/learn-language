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
public class WordIdRequest {
    private String germanWord;
    private String hungarianTranslation;
    @NotBlank
    private String sourceId;
}
