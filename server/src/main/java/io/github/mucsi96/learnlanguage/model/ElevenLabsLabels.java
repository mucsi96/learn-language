package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElevenLabsLabels {
    private String accent;
    private String descriptive;
    private String age;
    private String gender;
    private String language;
    private String locale;
}