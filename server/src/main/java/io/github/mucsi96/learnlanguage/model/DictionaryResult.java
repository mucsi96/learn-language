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
public class DictionaryResult {
    private String word;
    private String type;
    private String gender;
    private List<String> forms;
    private String translation;
    private String exampleDe;
    private String exampleTranslation;
}
