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
public class DictionaryTranslationResponse {
    private String translatedWord;
    private String definition;
    private String example;
    private List<String> synonyms;
    private String etymology;
    private String paraphrase;
}
