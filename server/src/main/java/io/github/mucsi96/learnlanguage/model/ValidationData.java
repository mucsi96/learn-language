package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationData {
    private String suggestedGender;
    private List<String> suggestedForms;
    private String extractedText;
}
